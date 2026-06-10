//+------------------------------------------------------------------+
//|                                          test_portfolio.mq5       |
//|  EA ส่งข้อมูลพอร์ตไปยัง MyPortfolio ทุก 1 นาที                     |
//|  ใช้ GrabWeb (WinInet) — ไม่ต้อง add URL ใน MT5                   |
//+------------------------------------------------------------------+
#property copyright "MT5 License Manager"
#property version   "1.00"
#include <Grabweb.mqh>

// ── Configuration ──
string   ServerURL = "https://mt5-license-manager.vercel.app";  // Server URL
input int      UpdateIntervalMinutes = 1;                         // อัปเดตทุกกี่นาที

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
      Print("[MyPortfolio] Data sent. Balance=", balance,
            " FloatPL=", floating_pl, " TotalProfit=", total_profit,
            " Resp=", webPage);
     }
   else
     {
      Print("[MyPortfolio] Failed to send data");
     }
  }

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
  {
   Print("[MyPortfolio] EA started. Sending first data now...");

   // ส่งข้อมูลทันที 1 ครั้ง
   SendPortfolioData();

   // จากนั้นอัปเดตทุก 1 นาที
   EventSetTimer(UpdateIntervalMinutes * 60);

   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
  }
//+------------------------------------------------------------------+
//| Timer function — เรียกทุก 1 นาที                                   |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SendPortfolioData();
  }
//+------------------------------------------------------------------+
