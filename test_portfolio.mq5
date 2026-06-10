//+------------------------------------------------------------------+
//|                                          test_portfolio.mq5       |
//|  EA สำหรับส่งข้อมูลพอร์ตไปยัง MyPortfolio ทุก 1 ชั่วโมง            |
//|  ใช้กับ MT5 License Manager                                      |
//+------------------------------------------------------------------+
#property copyright "MT5 License Manager"
#property version   "1.00"

// ── Configuration ──
input string   ServerURL = "https://mt5-license-manager.vercel.app";  // Server URL (เปลี่ยนตามจริง)
input int      UpdateIntervalMinutes = 60;                             // อัปเดตทุกกี่นาที

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
  {
   // สุ่ม delay เริ่มต้น 0-30 นาที (เพื่อกระจาย load ไม่ให้ทุกคนส่งพร้อมกัน)
   int delaySeconds = MathRand() % 1800;
   Print("[MyPortfolio] EA started. First update in ", delaySeconds, " seconds");
   EventSetTimer(delaySeconds); // ครั้งแรกหน่วงสุ่ม
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
//| Timer function                                                     |
//+------------------------------------------------------------------+
void OnTimer()
  {
   // ตั้ง timer ให้วิ่งทุก UpdateIntervalMinutes หลังจากครั้งแรก
   EventSetTimer(UpdateIntervalMinutes * 60);

   // เก็บข้อมูลพอร์ต
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double floating_pl = AccountInfoDouble(ACCOUNT_PROFIT);  // unrealized P/L

   // Total Profit = realized profit (คำนวณจาก closed trades)
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

   // เตรียม JSON
   string json = StringFormat(
      "{\"mt5_account\":\"%d\",\"balance\":%.2f,\"floating_pl\":%.2f,\"total_profit\":%.2f}",
      mt5_account, balance, floating_pl, total_profit
   );

   // ส่ง HTTP POST
   char data[], result[];
   string headers = "Content-Type: application/json\r\n";
   StringToCharArray(json, data, 0, StringLen(json));

   string url = ServerURL + "/api/portfolio/push";
   int res = WebRequest("POST", url, headers, 5000, data, result, NULL);

   if(res == 200)
     {
      Print("[MyPortfolio] Data sent successfully. Balance=", balance,
            " FloatPL=", floating_pl, " TotalProfit=", total_profit);
     }
   else
     {
      Print("[MyPortfolio] Failed to send data. HTTP status: ", res,
            " Error: ", CharArrayToString(result));
     }
  }
//+------------------------------------------------------------------+
