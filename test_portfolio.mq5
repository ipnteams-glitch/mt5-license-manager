//+------------------------------------------------------------------+
//|                                          test_portfolio.mq5       |
//|  EA ส่งข้อมูลพอร์ตไปยัง MyPortfolio                               |
//|  อัปเดต: หลังเที่ยงคืน 00:00-00:30 และ 17:00-17:30 (เวลาไทย)      |
//|  เฉพาะตอนไม่มีไม้ค้าง                                             |
//+------------------------------------------------------------------+
#property copyright "MT5 License Manager"
#property version   "1.00"
#include <Grabweb.mqh>

// ── Configuration ──
string   ServerURL = "https://mt5-license-manager.vercel.app";
input int      GMTOffset = 7;    // GMT offset (ไทย = +7)

bool   sentMidnight = false;     // ส่งรอบเที่ยงคืนแล้วหรือยัง
bool   sentEvening  = false;     // ส่งรอบ 17:00 แล้วหรือยัง

//+------------------------------------------------------------------+
//| ส่งข้อมูลพอร์ตขึ้น server                                         |
//+------------------------------------------------------------------+
void SendPortfolioData()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double floating_pl = AccountInfoDouble(ACCOUNT_PROFIT);

   double total_profit = 0;
   HistorySelect(0, TimeCurrent());
   int totalDeals = HistoryDealsTotal();
   for(int i = 0; i < totalDeals; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0)
        {
         if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT ||
            HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_INOUT)
           {
            total_profit += HistoryDealGetDouble(ticket, DEAL_PROFIT);
           }
        }
     }

   long mt5_account = AccountInfoInteger(ACCOUNT_LOGIN);

   string url = ServerURL + "/api/portfolio/push"
              + "?mt5_account=" + IntegerToString(mt5_account)
              + "&balance=" + DoubleToString(balance, 2)
              + "&floating_pl=" + DoubleToString(floating_pl, 2)
              + "&total_profit=" + DoubleToString(total_profit, 2);

   string webPage;
   bool ok = GrabWeb(url, webPage, 5000, false);

   if(ok)
     {
      Print("[MyPortfolio] OK. Bal=", DoubleToString(balance,2),
            " Float=", DoubleToString(floating_pl,2),
            " Profit=", DoubleToString(total_profit,2));
     }
   else
     {
      Print("[MyPortfolio] FAILED");
     }
  }

//+------------------------------------------------------------------+
//| Expert initialization                                              |
//+------------------------------------------------------------------+
int OnInit()
  {
   Print("[MyPortfolio] Started. Update windows: 00:00-00:30 / 17:00-17:30 TH");
   sentMidnight = false;
   sentEvening  = false;
   EventSetTimer(30);  // เช็คทุก 30 วิ
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Expert deinitialization                                            |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
  }
//+------------------------------------------------------------------+
//| Timer — เช็คทุก 30 วิ                                             |
//+------------------------------------------------------------------+
void OnTimer()
  {
   // คำนวนเวลาไทย
   datetime thaiTime = TimeGMT() + (GMTOffset * 3600);
   MqlDateTime dt;
   TimeToStruct(thaiTime, dt);

   int thaiHour   = dt.hour;
   int thaiMinute = dt.min;

   // ── รีเซ็ต flag เมื่อเข้าวันใหม่ ──
   if(thaiHour == 0 && thaiMinute < 1)
     {
      sentMidnight = false;
      sentEvening  = false;
     }

   // ── เช็คไม้ค้าง ──
   if(PositionsTotal() > 0)
      return;  // มีไม้ค้าง → ข้าม ไม่ส่ง

   // ── Window 1: เที่ยงคืน 00:00-00:30 ──
   if(thaiHour == 0 && thaiMinute < 30 && !sentMidnight)
     {
      Print("[MyPortfolio] Midnight update - no open positions");
      SendPortfolioData();
      sentMidnight = true;
      return;
     }

   // ── Window 2: 17:00-17:30 ──
   if(thaiHour == 17 && thaiMinute < 30 && !sentEvening)
     {
      Print("[MyPortfolio] 17:00 update - no open positions");
      SendPortfolioData();
      sentEvening = true;
      return;
     }

   // รีเซ็ต flag หลังพ้นช่วง (กันพลาด)
   if(thaiHour > 0)  sentMidnight = false;
   if(thaiHour > 17) sentEvening  = false;
  }
//+------------------------------------------------------------------+
