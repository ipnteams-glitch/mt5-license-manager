#property copyright "Copyright 2025, Nateephanu"
#property description "Line OA : @479ufnya"
#property description "https://www.facebook.com/harvestfarmea/"
#property link      "https://goldscalping.biz/"
#property icon      "\\Images\\hvf.ico"

#include <Trade\Trade.mqh> 
#include <Controls\Picture.mqh>
CPicture cp5,cp1,cp2,cp3,cp4;
//======================================================
#resource "\\Images\\b99.bmp";
#resource "\\Images\\b500.bmp";
#resource "\\Images\\b1390.bmp";
#resource "\\Images\\b4999.bmp";
#resource "\\Images\\checked.bmp";
#resource "\\Images\\run1.bmp";
#resource "\\Images\\sniper1.bmp";
#resource "\\Images\\atlantis1.bmp";
#resource "\\Images\\hhf.bmp";
#resource "\\Sounds\\tt.wav";
#resource "\\Sounds\\add1.wav";
#resource "\\Sounds\\add.wav";
#resource "\\Sounds\\expert.wav";
#resource "\\Sounds\\start.wav";
//============================================================================================================
//datetime expiryDate = D'2026.05.30 23:59'; // ใช้ API แทน
//============================================================================================================

string eaid = 26; bool swhid=false; bool difsw=false;
string apiUrl = "https://mt5-license-manager.vercel.app/api/verify-port";
bool Allow; string premium; string dateexpire; bool Pro=false;
ENUM_ACCOUNT_TRADE_MODE tradeMode=(ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE); 
//#import "shell32.dll"
int ShellExecuteW(int hwnd, string lpOperation, string lpFile, string lpParameters, string lpDirectory, int nShowCmd);
#import
//======================================================
string prefix = "atlantis"; //////////////////////////////  https://ipnteams-glitch.github.io/All_System/
//======================================================
string packet[] = {"b1390","b500","b99"};bool   showpacket=false;bool   stat=false;
#import "ws2_32.dll"
int WSAStartup(ushort wVersionRequested, int &WSAData[]);
int WSACleanup();
int socket(int af, int type, int protocol);
uint inet_addr(uchar &cp[]);
ushort htons(ushort hostshort);
int connect(int sock, int &name[], int namelen);
int recv(int sock, uchar &buf[], int len, int flags);
int send(int sock, uchar &buf[], int len, int flags);
int closesocket(int sock);
int ioctlsocket(int sock, uint cmd, int &argp);
int WSAGetLastError();
#import
datetime EA_Start_Time; 
enum xchannel { 
Channel_1=1, //Sys_1
Channel_2=2,  //Sys_2
Channel_3=3,  //Sys_3
Channel_4=4,  //Sys_4
Channel_5=5,  //Sys_5
Channel_6=6,  //Sys_6
Channel_7=7,  //Sys_7
Channel_8=8,  //Sys_8
Channel_9=9,  //Sys_9
Channel_10=10,  //Sys_10
Channel_11=11,  //Sys_11
Channel_12=12,  //Sys_12
Channel_13=13,  //Sys_13
Channel_14=14,  //Sys_14
Channel_15=15  //Sys_15

};

      string   InpServerIP   = "13.212.175.12";//"127.0.0.1";//"13.212.175.12";
      int      InpServerPort = 9001;
      string   AuthToken     = "SuperCopy999"; 

// 🚩 เพิ่ม URL ของ Google Script ตัวใหม่สำหรับดึงเวลา และตั้งค่าลิมิตเวลาเข้าสาย
  string   TimeSyncURL   = "https://script.google.com/macros/s/AKfycbwVoFlz4o-mtuJRBslR9dcR90fvYCmeuyfvH03FRCEsNoR7MYCs0wr3a41ix1gj0p_J/exec";
input xchannel Channel       = Channel_1; //System Style
input double   SPEEDx        = 1.0; 
input double   Sensitive     = 0.01; 
input int      Max           = 0;
  int      MaxLateSeconds= 2; 
input bool     Emergency = false;
      bool     Debug = false;
input int      CutLossDollar   = 0;
input int      ProfitDollar   = 0;
input group "Extra Setting"
input bool     Recovery = false;
input double   PipStep = 2000;

string Channel_ = "Sys_1";
CTrade trade;
int client_socket = -1;
datetime last_reconnect_time = 0;
datetime last_recv_time = 0; 
int GlobalTimeOffset = 0; // 🚩 ตัวแปรเก็บค่าความเพี้ยนของนาฬิกาคอมพิวเตอร์

string in_flight_tickets[50];
int flight_idx = 0;
static string tcp_buffer = ""; 
bool soundplay = true;

long magicnumber = 0;
// 🚩 ฟังก์ชันใหม่สำหรับดึงเวลาสากล
void SyncGlobalTime()
  {
   string reply = "";
   if(Debug) Print("⏱️ กำลังดึงเวลาสากลจาก Google...");
   
   if(GrabWeb(TimeSyncURL, reply, 5000)) 
     {
      long google_time = StringToInteger(reply);
      if(google_time > 1000000000) 
        {
         GlobalTimeOffset = (int)(TimeGMT() - (datetime)google_time); 
         if(Debug)Print("✅ [TIME SYNC] สำเร็จ! นาฬิกาคอมพิวเตอร์เพี้ยนไป: ", GlobalTimeOffset, " วินาที");
        }
      else 
        {
         if(Debug)Print("⚠️ [TIME SYNC] ข้อมูลเวลาผิดพลาด ใช้เวลาเครื่องปกติ");
        }
     }
   else 
     {
      if(Debug)Print("⚠️ [TIME SYNC] เชื่อมต่อ Google ไม่สำเร็จ ใช้เวลาเครื่องปกติ");
     }
  }

void logo()
{
            cp5.Create(0,"smode",0, 15, 35, 100, 100);
            ObjectSetInteger(0, "smode", OBJPROP_CORNER, CORNER_LEFT_UPPER);
            cp5.BmpName("::Images\\hhf.bmp");
}
void selec_chan(int Channel , string &Channel_)
{
   if(Channel == 1) Channel_ = "Sys_1";
   else if(Channel == 2) Channel_ = "Sys_2";
   else if(Channel == 3) Channel_ = "Sys_3";
   else if(Channel == 4) Channel_ = "Sys_4";
   else if(Channel == 5) Channel_ = "Sys_5";
   else if(Channel == 6) Channel_ = "Sys_6";
   else if(Channel == 7) Channel_ = "Sys_7";
   else if(Channel == 8) Channel_ = "Sys_8";
   else if(Channel == 9) Channel_ = "Sys_9";
   else if(Channel == 10) Channel_ = "Sys_10";
   else if(Channel == 11) Channel_ = "Sys_11";
   else if(Channel == 12) Channel_ = "Sys_12";
   else if(Channel == 13) Channel_ = "Sys_13";
   else if(Channel == 14) Channel_ = "Sys_14";
   else if(Channel == 15) Channel_ = "Sys_15";
   
}
int OnInit()
  {
  
   if(client_socket != -1) {closesocket(client_socket); WSACleanup(); }
   logo();
   Channel_ = "Sys_" + IntegerToString((int)Channel);
   magicnumber = 99999 + (int)Channel;
   //trade.SetExpertMagicNumber(99999 + (int)Channel);
   trade.SetExpertMagicNumber(99999 + (int)Channel);
   
   trade.SetAsyncMode(false); 
   EA_Start_Time = TimeGMT() - 60; 
   int wsaData[100];
   if(WSAStartup(0x0202, wsaData) != 0) return(INIT_FAILED);
   
   ConnectToServer();
   SyncGlobalTime(); // 🚩 สั่งรันฟังก์ชันดึงเวลาสากล 1 ครั้งตอนเปิด EA
   
      if(Allow==false) {
    _CreateEdit22(prefix+"exp","0000.00.00",120+20,30,8,150,25,CORNER_RIGHT_UPPER,true,clrYellow ,clrBlack,clrBlack,2,ALIGN_CENTER,"Arial Black");
    if(!Emergency) CheckLicenseAPI(); 
   }
   if(Allow || Emergency){
      if(Emergency) CreateRenewButton(); }   
   
   selec_chan(Channel,Channel_);
   CreateChan(Channel_);
   CreateExit();
   //Print("Expire "+expiryDate);
   //if(!CheckExpirationFixed(expiryDate)) ExpertRemove();
   EventSetMillisecondTimer(50);
   return(INIT_SUCCEEDED);
  }

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{     ObjectSetInteger(0,sparam,OBJPROP_STATE,false);
      if(sparam == prefix+"BtnRenew") 
      {  PlaySound("::sounds\\tt.wav");  
         if(!showpacket) {packetprice();showpacket=true;}
         else {
            ObjectsDeleteAll(0,"packetb1390",-1,-1);
            ObjectsDeleteAll(0,"packetb500",-1,-1);
            ObjectsDeleteAll(0,"packetb99",-1,-1);
            ObjectsDeleteAll(0,"packetb4999",-1,-1);
            ObjectsDeleteAll(0,"packchecked",-1,-1);
            showpacket=false;
            Sleep(1);
         }
         ChartRedraw(0);
         return;
      }   
      if(sparam == prefix+"Exit") 
      {  PlaySound("::sounds\\tt.wav");  
         
         if(!stat){ ObjectSetInteger(0,sparam,OBJPROP_BGCOLOR,clrGreen);stat=true;}
         else {ObjectSetInteger(0,sparam,OBJPROP_BGCOLOR,clrGray);stat=false;}
         ChartRedraw(0);
         return;
      }
      if(sparam == "smode") 
      { 
         string url = "https://ipnteams-glitch.github.io/All_System/"; 
          ShellExecuteW(0, "open", url, NULL, NULL, 1);
         return;
      }
      if(sparam == prefix+"Exit") 
      {  PlaySound("::sounds\\tt.wav");  
         
         if(!stat){ ObjectSetInteger(0,sparam,OBJPROP_BGCOLOR,clrGreen);stat=true;}
         else {ObjectSetInteger(0,sparam,OBJPROP_BGCOLOR,clrGray);stat=false;}
         return;
      }
      if(sparam == "packet"+packet[2]) 
      {  PlaySound("::sounds\\tt.wav");  
         if(MessageBox("Pay for 99bath/3d ?","Rent System",MB_YESNO)!=6) return;
         Payment99(); return;
      }
      if(sparam == "packet"+packet[1]) 
      {  PlaySound("::sounds\\tt.wav");  
         if(MessageBox("Pay for 500bath/30d ?","Rent System",MB_YESNO)!=6) return;
         Payment500(); return;
      }     
      if(sparam == "packet"+packet[0]) 
      {  PlaySound("::sounds\\tt.wav");  
         if(MessageBox("Pay for 1390bath/90d ?","Rent System",MB_YESNO)!=6) return;
         Payment1390(); return;
      }    
      if(sparam == "packetb4999") 
      {  PlaySound("::sounds\\tt.wav");  
         if(MessageBox("Pay for 4999bath/365d ?","Rent System",MB_YESNO)!=6) return;
         Payment4999(); return;
      }        
      if(sparam == "packchecked") 
      {  PlaySound("::sounds\\tt.wav");  
         if(MessageBox("Check Your Last Payment ?","Rent System",MB_YESNO)!=6) return;
         CheckSlipAdd(); return;
      }  
}

void CreateExit()
{
   string name = prefix+"Exit";
   ObjectDelete(0, name);
   ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 110);    
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 50);    
   ObjectSetInteger(0, name, OBJPROP_XSIZE, 120);        
   ObjectSetInteger(0, name, OBJPROP_YSIZE, 25);        
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, clrGray); 
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, clrGreen); 
   ObjectSetInteger(0, name, OBJPROP_COLOR, clrWhite);        
   ObjectSetString(0, name, OBJPROP_TEXT, "Close & Exit"); 
   ObjectSetString(0, name, OBJPROP_FONT, "Segoe UI");        
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
   ObjectSetInteger(0, name, OBJPROP_STATE, false);     
   ObjectSetInteger(0, name, OBJPROP_ZORDER, 10);        
   ObjectSetString(0, name, OBJPROP_TOOLTIP, "ออกจากโปรแกรมเมื่อปิดทั้งหมด++");
}
void CreateChan(string txt)
{
   string name = prefix+"Chan";
   ObjectDelete(0, name);
   ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 110);    
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 80);    
   ObjectSetInteger(0, name, OBJPROP_XSIZE, 100);        
   ObjectSetInteger(0, name, OBJPROP_YSIZE, 30);        
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, clrBlack); 
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, clrBlack); 
   ObjectSetInteger(0, name, OBJPROP_COLOR, clrYellow);        
   ObjectSetString(0, name, OBJPROP_TEXT, txt); 
   ObjectSetString(0, name, OBJPROP_FONT, "Arial Black");        
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 10);
   ObjectSetInteger(0, name, OBJPROP_STATE, false);     
   ObjectSetInteger(0, name, OBJPROP_ZORDER, 0);        
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, 0);        
}
void OnDeinit(const int reason) { 
 if(reason == 3 || reason == 5) return;
   EventKillTimer(); 
   ObjectsDeleteAll(0);
   if(client_socket != -1) closesocket(client_socket); WSACleanup(); }

bool ConnectToServer()
  {
   if(client_socket != -1) closesocket(client_socket);
   client_socket = socket(2, 1, 6);
   if(client_socket == -1) return false;

   int serv_addr[4]; ArrayInitialize(serv_addr, 0);
   uchar ip_bytes[]; StringToCharArray(InpServerIP, ip_bytes);
   uint ip_num = inet_addr(ip_bytes);
   ushort port_num = htons((ushort)InpServerPort);
   serv_addr[0] = 2 | (port_num << 16); serv_addr[1] = (int)ip_num;

   if(connect(client_socket, serv_addr, 16) != 0) { closesocket(client_socket); client_socket = -1; return false; }
   // 🚩 เติม \n เข้าไป เพื่อให้ Python Server รู้ว่านี่คือจบประโยคคำสั่งล็อกอินแล้ว!
   string login_msg = "LOGIN:" + Channel_ + ":" + AuthToken + "\n";
   //string login_msg = "LOGIN:" + Channel_ + ":" + AuthToken;
   uchar login_buf[]; StringToCharArray(login_msg, login_buf);
   send(client_socket, login_buf, ArraySize(login_buf) - 1, 0);

   int non_blocking = 1;
   ioctlsocket(client_socket, 0x8004667E, non_blocking);
   //Print("✅ [ROBOT] Connected: [", Channel_, "]");
   last_recv_time = TimeCurrent();
   return true;
  }

void OnTimer()
  {
   double pff = AccountInfoDouble(ACCOUNT_PROFIT);
   if(CutLossDollar > 0 || ProfitDollar > 0){
   if(PositionsTotal()>0){
      if(CutLossDollar > 0 && pff < 0 && MathAbs(pff) > MathAbs(CutLossDollar)
      || ProfitDollar > 0 && pff > 0 && pff > MathAbs(ProfitDollar)
      ){
      CloseAllMyPositions();
      return;}
   }
   }

     
   if(stat && PositionsTotal()==0) ExpertRemove();
   
   if(PositionsTotal()>0) {
      soundplay=false;
      if(Recovery){
         bool counts = countsys();
         if(pff!=0 && counts==false) {closeallsys();return;}
         if(pff < 0) CheckAndAddPositions(PipStep,0.01);
      }
   }
   if(PositionsTotal()==0 && soundplay==false){
      soundplay=true;
      PlaySound("::sounds\\add.wav"); 
   }
  
   if(client_socket == -1) { 
      if(TimeCurrent() - last_reconnect_time >= 3) { 
         last_reconnect_time = TimeCurrent(); 
         ConnectToServer(); 
      } 
      return; 
   }

   if(TimeCurrent() - last_recv_time > 20 && last_recv_time != 0) {
      if(Debug)Print("⚠️ [WATCHDOG] เน็ตหลับใน! ไม่ได้รับข้อมูลเกิน 20 วินาที กำลังรีเซ็ตท่อเชื่อมต่อ...");
      closesocket(client_socket); 
      client_socket = -1; 
      tcp_buffer = "";
      return;
   }

   uchar recv_buf[4096];
   int bytes_received = recv(client_socket, recv_buf, 4096, 0);

   if(bytes_received > 0) {
      last_recv_time = TimeCurrent();

      string raw_data = CharArrayToString(recv_buf, 0, bytes_received);
      tcp_buffer += raw_data; 
      
      int newline_pos = StringFind(tcp_buffer, "\n");
      string latest_valid_json = "";
      
      while(newline_pos >= 0) {
         latest_valid_json = StringSubstr(tcp_buffer, 0, newline_pos); 
         tcp_buffer = StringSubstr(tcp_buffer, newline_pos + 1);       
         newline_pos = StringFind(tcp_buffer, "\n");
      }
      
      if(latest_valid_json != "") { ProcessSignal(latest_valid_json); }
   }
   else if(bytes_received == 0) { closesocket(client_socket); client_socket = -1; tcp_buffer = ""; }
   else { int err = WSAGetLastError(); if(err != 10035) { closesocket(client_socket); client_socket = -1; tcp_buffer = ""; } }
  }

string EncodeTicket(string ticket_str) {
   string res = ticket_str;
   StringReplace(res, "0", "A"); StringReplace(res, "1", "B"); StringReplace(res, "2", "C"); StringReplace(res, "3", "D"); StringReplace(res, "4", "E");
   StringReplace(res, "5", "F"); StringReplace(res, "6", "G"); StringReplace(res, "7", "H"); StringReplace(res, "8", "I"); StringReplace(res, "9", "J");
   return res;
}
string DecodeTicket(string encoded_str) {
   string res = encoded_str;
   StringReplace(res, "A", "0"); StringReplace(res, "B", "1"); StringReplace(res, "C", "2"); StringReplace(res, "D", "3"); StringReplace(res, "E", "4"); 
   StringReplace(res, "F", "5"); StringReplace(res, "G", "6"); StringReplace(res, "H", "7"); StringReplace(res, "I", "8"); StringReplace(res, "J", "9");
   return res;
}
string GetSmartSymbol(string master_sym) {
   string m_sym = master_sym; StringToUpper(m_sym);
   SymbolSelect(m_sym, true);
   if(SymbolInfoDouble(m_sym, SYMBOL_BID) > 0) return m_sym;
   string base_sym = m_sym; int dot_idx = StringFind(base_sym, ".");
   if(dot_idx > 0) base_sym = StringSubstr(base_sym, 0, dot_idx); 
   else if(StringLen(base_sym) > 6 && StringFind(base_sym, "GOLD") < 0) base_sym = StringSubstr(base_sym, 0, 6); 
   string alias1 = base_sym; string alias2 = base_sym;
   if(StringFind(base_sym, "GOLD") >= 0) alias2 = "XAUUSD"; 
   else if(StringFind(base_sym, "XAU") >= 0) alias2 = "GOLD"; 
   for(int i = 0; i < SymbolsTotal(false); i++) {
      string slave_sym = SymbolName(i, false);
      string slave_upper = slave_sym; StringToUpper(slave_upper);
      if(StringFind(slave_upper, alias1) == 0 || StringFind(slave_upper, alias2) == 0) { SymbolSelect(slave_sym, true); return slave_sym; }
   }
   return master_sym;
}

void ProcessSignal(string json_msg)
  {
   string ch_tag = "\"channel\":\"";
   int ch_start = StringFind(json_msg, ch_tag);
   if(ch_start != -1) {
      ch_start += StringLen(ch_tag);
      int ch_end = StringFind(json_msg, "\"", ch_start);
      string sig_channel = StringSubstr(json_msg, ch_start, ch_end - ch_start);
      if(sig_channel != Channel_) return; 
   }

   string list_tag = "\"master_list\":\"";
   int start = StringFind(json_msg, list_tag);
   if(start == -1) return;
   start += StringLen(list_tag);
   int end = StringFind(json_msg, "\"", start);
   if(end == -1) return;
   
   string master_list = StringSubstr(json_msg, start, end - start);
   
   if(master_list == "MASTER_EMPTY") 
     {
      bool have_pos = false;
      for(int i=0; i<PositionsTotal(); i++) {
         if(PositionSelectByTicket(PositionGetTicket(i)) && PositionGetInteger(POSITION_MAGIC) == 99999 + (int)Channel) {
            have_pos = true; break;
         }
      }
      if(have_pos) CloseAllMyPositions(); 
      return; 
     }

   // 🧹 ด่านกวาดล้าง
   trade.SetAsyncMode(true); 

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong s_ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(s_ticket) && PositionGetInteger(POSITION_MAGIC) == 99999 + (int)Channel)
        {
         string my_comment = PositionGetString(POSITION_COMMENT);
         string decoded_m_ticket = DecodeTicket(my_comment);
         
         if(StringFind(master_list, decoded_m_ticket + ":") < 0)
           {
            if(Debug)Print("✂️ ไม้นี้ Master ปิดไปแล้ว! กำลังสั่งปิดตาม: ", decoded_m_ticket);
            trade.PositionClose(s_ticket);
           }
        }
     }

   trade.SetAsyncMode(false); 
   if(master_list == "MASTER_EMPTY") return;

   // 🎯 ด่านเปิดไม้ 
   string rows[]; StringSplit(master_list, '|', rows);
   
   for(int i = 0; i < ArraySize(rows); i++)
     {
      if(rows[i] == "") continue;
      string data[]; StringSplit(rows[i], ':', data);
      
      if(ArraySize(data) >= 5) {
         string m_ticket = data[0];
         string type = data[2];
         
         double master_lot = StringToDouble(data[3]); 
         if(master_lot < Sensitive) continue; 
         
         double final_lot = NormalizeDouble(master_lot * SPEEDx, 2); 
         if(final_lot < 0.01) final_lot = 0.01;
         
         datetime m_time = (datetime)StringToInteger(data[4]); 
         
         // 🚩 ระบบป้องกันการเข้าสาย 2 วินาที (ใช้เวลาโลกฝั่ง Slave)

         // 🚩 ระบบป้องกันการเข้าสาย 2 วินาที
         if(MaxLateSeconds > 0) {
            datetime slave_true_gmt = TimeGMT() - GlobalTimeOffset;
            int age_seconds = (int)(slave_true_gmt - m_time);
            
            // 🚩 ใส่ Print ตรงนี้! เราจะได้เห็นคาตาว่ามันคำนวณอายุไม้ออกมาเป็นกี่วินาที
            if(Debug) Print(">> [DEBUG] ตรวจสอบเวลาไม้ | เวลาเปิด(สากล): ", m_time, " | เวลาตอนนี้(สากล): ", slave_true_gmt, " | อายุไม้: ", age_seconds, " วินาที");
            
            if(age_seconds > MaxLateSeconds) {
               if(Debug) Print("⏳ ไม้นี้อายุ ", age_seconds, " วินาที ช้ากว่ากำหนด (", MaxLateSeconds, " วิ) ข้าม!");
               continue; 
            }
         }
          
         bool already_have = false;
         for(int j=0; j<50; j++) if(in_flight_tickets[j] == m_ticket) { already_have = true; break; }
         
         string encoded_target = EncodeTicket(m_ticket);
         for(int k = 0; k < PositionsTotal(); k++) {
            if(PositionSelectByTicket(PositionGetTicket(k)) && PositionGetString(POSITION_COMMENT) == encoded_target) { already_have = true; break; }
         }

         if(!already_have) {
            int my_pos_count = 0;
               for(int p = 0; p < PositionsTotal(); p++) {
                  if(PositionSelectByTicket(PositionGetTicket(p)) && PositionGetInteger(POSITION_MAGIC) == 99999 + (int)Channel) my_pos_count++;
               } 
               //if(Channel==1){
               //if(my_pos_count==1 && final_lot==0.01){
               //   continue;                
               //}}            
            if(Max > 0) {  
               if(my_pos_count >= Max) continue; 
            }
            
            // 🚩 [ปลดล็อก 1] ให้ target_sym ทำงานตามที่ GetSmartSymbol คำนวณมาจริงๆ โดยไม่ยึดติดกับหน้าจอกราฟปัจจุบัน
            string target_sym = GetSmartSymbol(data[1]); 
            bool trade_success = false;
            
            //double final_lot = NormalizeDouble(master_lot * SPEEDx, 2); 
            //if(Channel==1){
            //  double final_lot1 = calculatelot(my_pos_count,final_lot);
            //  final_lot = NormalizeDouble(final_lot1 * SPEEDx, 2); 
            //}
            
            // 🚩 [ปลดล็อก 2] ส่ง target_sym เข้าไปให้ฟังก์ชันเช็คระยะห่างแทน _Symbol
            if(type == "BUY") {
              if(IsDistanceEnoughByType(target_sym, 10, POSITION_TYPE_BUY, 99999 + (int)Channel))
                 trade_success = trade.Buy(final_lot, target_sym, 0, 0, 0, encoded_target);}
            if(type == "SELL"){   
              if(IsDistanceEnoughByType(target_sym, 10, POSITION_TYPE_SELL, 99999 + (int)Channel))
                 trade_success = trade.Sell(final_lot, target_sym, 0, 0, 0, encoded_target);}

            if(trade_success) {
               if(Debug)Print("🎯 ยิงออเดอร์ใหม่สำเร็จ! Ticket: ", m_ticket, " | Symbol: ", target_sym, " | Lot: ", final_lot);
               in_flight_tickets[flight_idx] = m_ticket;
               flight_idx = (flight_idx + 1) % 50;
            }
         }
      }
     }
  }
  
void CloseAllMyPositions()
  {
   trade.SetAsyncMode(true); 
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong s_ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(s_ticket))
        {
         if(PositionGetInteger(POSITION_MAGIC) == 555556 || PositionGetInteger(POSITION_MAGIC) == 99999 + (int)Channel) { trade.PositionClose(s_ticket); }
        }
     }
   trade.SetAsyncMode(false);
   if(Debug)Print("🧹 [CLEANUP] Master พอร์ตว่างแล้ว! สั่งปิดทุกไม้ใน Slave เรียบร้อย");
  }

void _CreateEdit22(string input_name,string input_text,long input_x_pos,long input_y_pos,int input_font_size=10
,int input_x_size=70,int input_y_size=30,int corner=CORNER_LEFT_UPPER,bool input_read_only=false,color input_text_color=clrBlack,color input_bg_color=clrWhite
,color input_border_color=clrBlack,int input_borders=0,int input_align=ALIGN_CENTER,string fontstyle="Arial Black")
{
ObjectCreate(0,input_name,OBJ_EDIT,0,0,0);
ObjectSetInteger(0,input_name,OBJPROP_COLOR,input_text_color);
ObjectSetInteger(0,input_name,OBJPROP_BGCOLOR,input_bg_color);
ObjectSetInteger(0,input_name,OBJPROP_BORDER_COLOR,input_border_color);
ObjectSetInteger(0,input_name,OBJPROP_XDISTANCE,input_x_pos);
ObjectSetInteger(0,input_name,OBJPROP_YDISTANCE,input_y_pos);
ObjectSetInteger(0,input_name,OBJPROP_XSIZE,input_x_size);
ObjectSetInteger(0,input_name,OBJPROP_YSIZE,input_y_size);
ObjectSetString(0,input_name,OBJPROP_TEXT,input_text);
ObjectSetInteger(0,input_name,OBJPROP_FONTSIZE,input_font_size);
ObjectSetString(0,input_name,OBJPROP_FONT,fontstyle);
ObjectSetInteger(0,input_name,OBJPROP_READONLY,true);
ObjectSetInteger(0,input_name,OBJPROP_ALIGN,input_align);
ObjectSetInteger(0,input_name,OBJPROP_CORNER,corner);
ObjectSetInteger(0,input_name,OBJPROP_BACK,false);
ObjectSetInteger(0,input_name,OBJPROP_SELECTABLE,false);
ObjectSetInteger(0,input_name,OBJPROP_SELECTED,false);
} 

void CreateRenewButton()
{
   string name = prefix+"BtnRenew";
   ObjectDelete(0, name);
   ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_RIGHT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 110);    
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 80);    
   ObjectSetInteger(0, name, OBJPROP_XSIZE, 85);        
   ObjectSetInteger(0, name, OBJPROP_YSIZE, 25);        
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, C'0,120,215'); 
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, clrFireBrick); 
   ObjectSetInteger(0, name, OBJPROP_COLOR, clrWhite);        
   ObjectSetString(0, name, OBJPROP_TEXT, "RENT"); 
   ObjectSetString(0, name, OBJPROP_FONT, "Segoe UI");        
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
   ObjectSetInteger(0, name, OBJPROP_STATE, false);     
   ObjectSetInteger(0, name, OBJPROP_ZORDER, 10);        
   ObjectSetString(0, name, OBJPROP_TOOLTIP, "เพิ่มวันใช้งานไม่จำกัดโบรค+");
}

void Payment500()
{
   const string WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyPTaqPee9pe-ncdK7FpjNI3Cq0NfE5W46msfydPa2ofv93z48WsZAgdfa6oFh62HBTaw/exec";
   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string fullUrl = WEB_APP_URL + "?port=" + IntegerToString(accountNumber) + "&ea=" + IntegerToString(eaid);
   ShellExecuteW(0, "open", fullUrl, "", "", 1);
}

void Payment99()
{
   const string WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxMmyN0RBD-lLoQdDD-b-i9iqkBXHtWRsuQb2GSbWCIbZ6DwArLohyEW_7P4epOh_Os4A/exec";
   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string fullUrl = WEB_APP_URL + "?port=" + IntegerToString(accountNumber) + "&ea=" + IntegerToString(eaid);
   ShellExecuteW(0, "open", fullUrl, "", "", 1);
}
void Payment1390()
{
   const string WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwBxPyrJxeFtouRuihhCx9uWdkUsTls1p-qBs7tD3lLLUWZUh9eINkCzEQrc90ga6PIbA/exec";
   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string fullUrl = WEB_APP_URL + "?port=" + IntegerToString(accountNumber) + "&ea=" + IntegerToString(eaid);
   ShellExecuteW(0, "open", fullUrl, "", "", 1);
}

void Payment4999()
{
   const string WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyvVeb2zpA6Akve4JyRHHBdKbciJrArou348vFZ1Spnl-1_W63HB2NJaayKV8lY_g2t7g/exec";
   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string fullUrl = WEB_APP_URL + "?port=" + IntegerToString(accountNumber) + "&ea=" + IntegerToString(eaid);
   ShellExecuteW(0, "open", fullUrl, "", "", 1);
}

void CheckSlipAdd()
{
   const string WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxLujf4fuBQjW7Qx-dojCrjfexe8Atqhg3lVywKdu2VXVAglVXHLQWJ7JDMs5IHmGw/exec";
   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string fullUrl = WEB_APP_URL + "?port=" + IntegerToString(accountNumber) + "&ea=" + IntegerToString(eaid);
   ShellExecuteW(0, "open", fullUrl, "", "", 1);
}

void CheckLicenseAPI()
  {
   if(Debug)Print("Checking license via API...");
   
   long account = AccountInfoInteger(ACCOUNT_LOGIN);
   string url = apiUrl + "?account=" + IntegerToString(account);
   
   char data[], result[];
   string headers;
   int timeout = 5000;
   
   if(Debug)Print("API URL: ", url);
   
   int res = WebRequest("GET", url, "", timeout, data, result, headers);
   
   if(res == 200)
     {
      string response = CharArrayToString(result);
      if(Debug)Print("API Response: ", response);
      
      if(StringFind(response, "\"valid\":true") >= 0)
        {
         Allow = true;
         
         int pkgStart = StringFind(response, "\"package\":\"") + 12;
         int pkgEnd = StringFind(response, "\"", pkgStart);
         if(pkgStart > 11 && pkgEnd > pkgStart)
            premium = StringSubstr(response, pkgStart, pkgEnd - pkgStart);
         
         int expStart = StringFind(response, "\"expiry_date\":\"") + 16;
         int expEnd = StringFind(response, "\"", expStart);
         if(expStart > 15 && expEnd > expStart)
           {
            dateexpire = StringSubstr(response, expStart, expEnd - expStart);
            StringReplace(dateexpire, "-", ".");
            dateexpire = StringSubstr(dateexpire, 0, 10);
           }
         
         int daysStart = StringFind(response, "\"days_left\":") + 13;
         int daysEnd = StringFind(response, ",", daysStart);
         if(daysEnd < 0) daysEnd = StringFind(response, "}", daysStart);
         string daysLeft = StringSubstr(response, daysStart, daysEnd - daysStart);
         
         Print("License OK - Package: ", premium, " Expiry: ", dateexpire, " Days left: ", daysLeft);
         ObjectSetString(0, prefix+"exp", OBJPROP_TEXT, dateexpire);
         PlaySound("::sounds\\start.wav");
        }
      else
        {
         Allow = false;
         Print("License denied - port not found or expired");
         PlaySound("::sounds\\eraseall.wav");
         MessageBox(IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + " not authorized", "License Error");
         ExpertRemove();
        }
     }
   else
     {
      Print("API request failed, code: ", res);
      
      Allow = true;
      dateexpire = TimeToString(TimeCurrent() + 86400, TIME_DATE);
      premium = "offline";
      Print("API DOWN - offline mode, expires in 24h");
      ObjectSetString(0, prefix+"exp", OBJPROP_TEXT, dateexpire);
      PlaySound("::sounds\\start.wav");
     }
  }

void packetprice()
{            
    int x1 = 30;  
    int y1 = 130;  
    int x2 = 100; 
    int y2 = 150; 
    
            cp1.Create(0,"packet"+packet[0],0, x1, y1, x2, y2);
            ObjectSetInteger(0, "packet"+packet[0], OBJPROP_CORNER, CORNER_RIGHT_UPPER);
            ObjectSetInteger(0, "packet"+packet[0], OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
            cp1.BmpName("::Images\\"+packet[0]+".bmp");
            ObjectSetString(0, "packet"+packet[0], OBJPROP_TOOLTIP,  "แพคเกจใช้ประจำ 90 วัน 1,390 บาท");
            
            cp2.Create(0,"packet"+packet[1],0, x1+80, y1, x2+80, y2);
            ObjectSetInteger(0, "packet"+packet[1], OBJPROP_CORNER, CORNER_RIGHT_UPPER);
            ObjectSetInteger(0, "packet"+packet[1], OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
            cp2.BmpName("::Images\\"+packet[1]+".bmp");
            ObjectSetString(0, "packet"+packet[1], OBJPROP_TOOLTIP, "แพคเกจเริ่มต้น 30 วัน 500 บาท"); 
            
            cp3.Create(0,"packet"+packet[2],0, x1+160, y1, x2+160, y2);
            ObjectSetInteger(0, "packet"+packet[2], OBJPROP_CORNER, CORNER_RIGHT_UPPER);
            ObjectSetInteger(0, "packet"+packet[2], OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
            cp3.BmpName("::Images\\"+packet[2]+".bmp");
            ObjectSetString(0, "packet"+packet[2], OBJPROP_TOOLTIP, "แพคเกจทดลอง 3 วัน 99 บาท");
            
            cp4.Create(0,"packetb4999",0, x1+160, y1+80, x2+160, y2+180);
            ObjectSetInteger(0, "packetb4999", OBJPROP_CORNER, CORNER_RIGHT_UPPER);
            ObjectSetInteger(0, "packetb4999", OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
            cp4.BmpName("::Images\\b4999.bmp");
            ObjectSetString(0, "packetb4999", OBJPROP_TOOLTIP, "แพคเกจอาชีพ 365 วัน");
            
            cp4.Create(0,"packchecked",0, x1+5, y1+100, x2+160, y2+180);
            ObjectSetInteger(0, "packchecked", OBJPROP_CORNER, CORNER_RIGHT_UPPER);
            ObjectSetInteger(0, "packchecked", OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
            cp4.BmpName("::Images\\checked.bmp");
            ObjectSetString(0, "packchecked", OBJPROP_TOOLTIP, "ตรวจสอบยอดล่าสุด");            
            ChartRedraw(0);
}
double calculatelot(int slaveCount, double masterLot)
{
   // 1. ไม้แรกของ Slave บังคับ 0.01 เสมอ (slaveCount = 0 คือเปิดไม้แรก)
   if (slaveCount <= 0) return 0.01;

   // 2. แกะรอยหาว่าตอนนี้ Master อยู่ไม้ที่เท่าไหร่ (Index ไหน)
   // ใช้วิธีรันสูตรจำลองไปเรื่อยๆ จนกว่าจะได้ลอตเท่ากับ Master ปัจจุบัน
   int currentMasterCount = 0;
   double tempMasterLot = 0.01;
   
   while (NormalizeDouble(tempMasterLot, 2) < NormalizeDouble(masterLot, 2)) {
      currentMasterCount++;
      
      if (currentMasterCount == 1) tempMasterLot = 0.02;
      else if (currentMasterCount == 2) tempMasterLot = 0.03;
      else if (currentMasterCount == 3) tempMasterLot = 0.05;
      else if (currentMasterCount >= 11) tempMasterLot = NormalizeDouble(tempMasterLot * 2.0, 2); // ตั้งแต่ไม้ 12 (Index 11) คูณ 2
      else tempMasterLot = NormalizeDouble(tempMasterLot * 1.4, 2); // ช่วงปกติคูณ 1.4
      
      // ป้องกันลูปค้าง (Break safe) เผื่อมีข้อผิดพลาดรันเกิน 100 ไม้
      if (currentMasterCount > 100) break; 
   }

   // 3. จำลองการออกไม้ของ Slave ตั้งแต่ไม้ 0 จนถึงไม้ปัจจุบัน (slaveCount)
   double currentSlaveLot = 0.01; 
   
   for (int i = 1; i <= slaveCount; i++) {
      // ณ จังหวะที่ Slave กำลังจะออกไม้ที่ i, ตอนนั้น Master อยู่ไม้ที่เท่าไหร่?
      int mCountAtStep = currentMasterCount - slaveCount + i;
      
      // ถ้าตอนนั้น Master เข้าสู่โซนคูณ 2 (Index >= 11) -> Slave ต้องคูณ 2 ตามทันที
      if (mCountAtStep >= 11) {
         currentSlaveLot = NormalizeDouble(currentSlaveLot * 2.0, 2);
      } 
      // ถ้า Master ยังอยู่ในช่วงปกติ -> Slave รันตามสเต็ปของตัวเอง
      else {
         if (i == 1) currentSlaveLot = 0.02;
         else if (i == 2) currentSlaveLot = 0.03;
         else if (i == 3) currentSlaveLot = 0.05;
         else currentSlaveLot = NormalizeDouble(currentSlaveLot * 1.4, 2);
      }
   }
   
   return currentSlaveLot;
}
double calculatelot111111111111111(int slaveCount, double masterLot)
{
   // 1. ไม้แรกของ Slave บังคับ 0.01 เสมอ
   if (slaveCount <= 0) return 0.01;

   // 2. แกะรอยว่าตอนนี้ Master อยู่ไม้ที่เท่าไหร่ (Index ไหน) จากค่า masterLot
   int currentMasterCount = 0;
   
   if (masterLot > 0.80) { 
      // โซนวิกฤต (ทะลุ 0.54 มาแล้ว เริ่มคูณ 2)
      currentMasterCount = 10; // เริ่มต้นอ้างอิงที่ 0.54 (ไม้ที่ 11 หรือ Index 10)
      double tempLot = 0.54;
      while (tempLot * 1.5 < masterLot) { // วนลูปหา Index ปัจจุบันของ Master
         tempLot *= 2.0;
         currentMasterCount++;
      }
   } else {
      // โซนปกติ (เราใช้ค่ากลางเผื่อความคลาดเคลื่อนของทศนิยม)
      if (masterLot <= 0.015) currentMasterCount = 0;
      else if (masterLot <= 0.025) currentMasterCount = 1;
      else if (masterLot <= 0.040) currentMasterCount = 2; // 0.03
      else if (masterLot <= 0.060) currentMasterCount = 3; // 0.05
      else if (masterLot <= 0.085) currentMasterCount = 4; // 0.07
      else if (masterLot <= 0.120) currentMasterCount = 5; // 0.10
      else if (masterLot <= 0.170) currentMasterCount = 6; // 0.14
      else if (masterLot <= 0.240) currentMasterCount = 7; // 0.20
      else if (masterLot <= 0.330) currentMasterCount = 8; // 0.28
      else if (masterLot <= 0.460) currentMasterCount = 9; // 0.39
      else currentMasterCount = 10;                        // 0.54
   }

   // 3. จำลองการรันสเต็ปของ Slave จากไม้ที่ 0 ไปจนถึงไม้ปัจจุบัน (slaveCount)
   double currentSlaveLot = 0.01; 
   
   for (int i = 1; i <= slaveCount; i++) {
      // ณ ตอนที่ Slave ออกไม้ที่ i, ทาง Master อยู่ที่ไม้ (Index) ไหน?
      int mCountAtStep = currentMasterCount - slaveCount + i;
      
      // ถ้าจังหวะนั้น Master เข้าสู่ไม้ที่ 12 (Index 11 คือ 1.08 เป็นต้นไป) -> Slave คูณ 2 ทันที
      if (mCountAtStep >= 11) {
         currentSlaveLot = NormalizeDouble(currentSlaveLot * 2.0, 2);
      } 
      // ถ้า Master ยังอยู่ในช่วงปกติ (<= 0.54) -> Slave วิ่งตามสเต็ปของตัวเอง
      else {
         if (i == 1) currentSlaveLot = 0.02;
         else if (i == 2) currentSlaveLot = 0.03;
         else if (i == 3) currentSlaveLot = 0.05;
         else currentSlaveLot = NormalizeDouble(currentSlaveLot * 1.4, 2);
      }
   }
   
   return currentSlaveLot;
}

bool CheckExpirationFixed(datetime expiryDate)
{
   // --- ระบุวันที่เริ่มและวันที่หมดอายุให้ชัดเจน ---
   datetime startDate = D'2026.04.27 00:00'; // วันเริ่ม 27 Apr 2026
   ////datetime expiryDate = D'2026.05.30 23:59'; // ใช้ API แทน // วันหมดอายุ 30 May 2026
   
   datetime currentTime = TimeCurrent(); // ใช้เวลา Server เพื่อป้องกันการแก้เวลาในคอม

   // 1. ตรวจสอบว่ายังไม่ถึงเวลาเริ่มใช้งานหรือไม่
   /*if(currentTime < startDate)
   {
      Alert("EA is not active yet. Starting date: ", TimeToString(startDate, TIME_DATE));
      return false;
   }*/

   // 2. ตรวจสอบว่าหมดอายุหรือยัง
   if(currentTime > expiryDate)
   {
      //Alert("EA Expired on 30 May 2026. Please contact developer for renewal.");
      Print("Current Server Time: ", TimeToString(currentTime));
      return false;
   }

   // แสดงวันคงเหลือ (Optional)
   int daysLeft = (int)((expiryDate - currentTime) / (24 * 3600));
   Comment("System Active | Expiring in: ", daysLeft, " days");
   
   return true;
}

//+------------------------------------------------------------------+
//| ฟังก์ชันตรวจสอบระยะห่างของราคาปัจจุบันกับ Position ล่าสุด              |
//+------------------------------------------------------------------+
// 🚩 [ปลดล็อกส่วนที่ 3] อัปเกรดให้รองรับทุกคู่เงินโดยรับ target_symbol เข้ามาแทน _Symbol
bool IsDistanceEnoughByType(string target_symbol, int min_distance_points, ENUM_POSITION_TYPE pos_type, ulong magic_number = 0)
{
    int total = PositionsTotal();
    
    datetime last_time = 0;
    double last_price = 0.0;
    bool found = false;

    // วนลูปหา Position ล่าสุดของ Symbol, Magic Number และ "ฝั่ง" ที่ต้องการ
    for(int i = 0; i < total; i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket > 0)
        {
            // ตรวจสอบว่าเป็นคู่เงินเดียวกัน 🚩 เปลี่ยนเป็น target_symbol
            if(PositionGetString(POSITION_SYMBOL) == target_symbol)
            {
                // ตรวจสอบ Magic Number
                if(magic_number == 0 || PositionGetInteger(POSITION_MAGIC) == magic_number || PositionGetInteger(POSITION_MAGIC) == 555556)
                {
                    // ตรวจสอบว่าเป็นฝั่งที่ระบุหรือไม่ (Buy หรือ Sell)
                    if((ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE) == pos_type)
                    {
                        datetime time = (datetime)PositionGetInteger(POSITION_TIME);
                        
                        // อัปเดตข้อมูลหากพบ Position ที่เปิดล่าสุดของฝั่งนั้น
                        if(time > last_time)
                        {
                            last_time = time;
                            last_price = PositionGetDouble(POSITION_PRICE_OPEN);
                            found = true;
                        }
                    }
                }
            }
        }
    }

    // ถ้ามี Position ฝั่งที่ตรวจสอบเปิดอยู่ ให้คำนวณระยะห่าง
    if(found)
    {
        double current_price = 0;
        
        // เลือกใช้ราคาให้ตรงกับฝั่ง (Buy อิง Ask, Sell อิง Bid) 🚩 เปลี่ยนเป็นดึงราคาจาก target_symbol
        if(pos_type == POSITION_TYPE_BUY)
        {
            current_price = SymbolInfoDouble(target_symbol, SYMBOL_ASK);
        }
        else if(pos_type == POSITION_TYPE_SELL)
        {
            current_price = SymbolInfoDouble(target_symbol, SYMBOL_BID);
        }
            
        // คำนวณระยะห่างสัมบูรณ์ (Absolute) แล้วหารด้วยขนาดของจุด (Point) ของคู่นั้นๆ 🚩
        double target_point = SymbolInfoDouble(target_symbol, SYMBOL_POINT);
        double distance_in_points = MathAbs(current_price - last_price) / target_point;

        // ถ้าห่างเกินค่าที่ตั้งไว้ คืนค่า true
        if(distance_in_points > min_distance_points)
        {
            return true;
        }
        return false;
    }

    // กรณีไม่มี Position ฝั่งที่ต้องการเปิดอยู่เลย (สามารถเปิดไม้แรกของฝั่งนั้นได้)
    return true; 
}

// 🚩 (อันนี้อัปเกรดแถมให้เผื่อในอนาคตใช้งานครับ แก้จาก _Symbol เป็น target_symbol เหมือนกัน)
bool IsDistanceEnough(string target_symbol, int min_distance_points, ulong magic_number = 0)
{
    int total = PositionsTotal();
    
    // ถ้าไม่มี Position เลย คืนค่า true เพื่อให้สามารถเปิดไม้แรกได้
    if(total == 0) return true; 

    datetime last_time = 0;
    double last_price = 0.0;
    bool found = false;

    // วนลูปหา Position ล่าสุดของ Symbol และ Magic Number นี้
    for(int i = 0; i < total; i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket > 0)
        {
            if(PositionGetString(POSITION_SYMBOL) == target_symbol)
            {
                // ตรวจสอบ Magic Number (ถ้ากำหนด)
                if(magic_number == 0 || PositionGetInteger(POSITION_MAGIC) == magic_number)
                {
                    datetime time = (datetime)PositionGetInteger(POSITION_TIME);
                    
                    // อัปเดตข้อมูลหากพบ Position ที่เปิดล่าสุด (เวลาใหม่กว่า)
                    if(time > last_time)
                    {
                        last_time = time;
                        last_price = PositionGetDouble(POSITION_PRICE_OPEN);
                        found = true;
                    }
                }
            }
        }
    }

    // ถ้าระบุ Position ล่าสุดได้
    if(found)
    {
        // ใช้ราคาปัจจุบัน (Bid) ในการคำนวณ
        double current_price = SymbolInfoDouble(target_symbol, SYMBOL_BID);
        
        // คำนวณระยะห่างสัมบูรณ์ (Absolute) แล้วหารด้วยขนาดของจุด
        double target_point = SymbolInfoDouble(target_symbol, SYMBOL_POINT);
        double distance_in_points = MathAbs(current_price - last_price) / target_point;

        // ถ้าห่างเกิน 100 จุด (หรือค่าที่ตั้งไว้) ให้คืนค่า true
        if(distance_in_points > min_distance_points)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    // กรณีไม่มี Position ที่ตรงกับเงื่อนไขเลย
    return true; 
}
//+------------------------------------------------------------------+
//| ฟังก์ชันสำหรับตรวจสอบและเพิ่มไม้ตามระยะที่กำหนด                             |
//+------------------------------------------------------------------+


void CheckAndAddPositions(int step_points, double lot_size)
{
    CTrade trade;
    

    // 1. หาคู่เงินทั้งหมดที่มี Position ถืออยู่ (เก็บใส่ Array แบบไม่ซ้ำกัน)
    string symbols[];
    int total_positions = PositionsTotal();
    
    for(int i = 0; i < total_positions; i++)
    {
        string sym = PositionGetSymbol(i);
        bool is_exist = false;
        
        // เช็คว่ามีชื่อคู่เงินนี้ใน Array หรือยัง
        for(int j = 0; j < ArraySize(symbols); j++)
        {
            if(symbols[j] == sym) 
            { 
                is_exist = true; 
                break; 
            }
        }
        
        // ถ้ายังไม่มีให้เพิ่มเข้าไป
        if(!is_exist)
        {
            int size = ArraySize(symbols);
            ArrayResize(symbols, size + 1);
            symbols[size] = sym;
        }
    }

    // 2. วนลูปตรวจสอบเงื่อนไขในแต่ละคู่เงินที่พบ
    for(int i = 0; i < ArraySize(symbols); i++)
    {
        string sym = symbols[i];
        
        double last_buy_price = 0.0;
        double last_sell_price = 0.0;
        datetime last_buy_time = 0;
        datetime last_sell_time = 0;

        // 3. หา "ไม้ล่าสุด" (อิงจากเวลาเปิด) ของฝั่ง Buy และ Sell ในคู่เงินนั้นๆ
        for(int j = 0; j < PositionsTotal(); j++)
        {
            if(PositionGetSymbol(j) == sym)
            {
                // ถ้ามีการกำหนด Magic Number ให้เช็คด้วย (ถ้ากำหนดเป็น 0 คือเช็คทุกออเดอร์)
                //if(PositionGetInteger(POSITION_MAGIC) != magicnumber) 
                //    continue;

                long type = PositionGetInteger(POSITION_TYPE);
                datetime time = (datetime)PositionGetInteger(POSITION_TIME);
                double price = PositionGetDouble(POSITION_PRICE_OPEN);

                if(type == POSITION_TYPE_BUY)
                {
                    if(time > last_buy_time) 
                    { 
                        last_buy_time = time; 
                        last_buy_price = price; 
                    }
                }
                else if(type == POSITION_TYPE_SELL)
                {
                    if(time > last_sell_time) 
                    { 
                        last_sell_time = time; 
                        last_sell_price = price; 
                    }
                }
            }
        }

        // 4. ดึงค่า Point และราคาปัจจุบันของคู่เงินนั้น
        double point = SymbolInfoDouble(sym, SYMBOL_POINT);
        double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
        double bid = SymbolInfoDouble(sym, SYMBOL_BID);

        // 5. ตรวจสอบเงื่อนไขเปิดไม้ Buy เพิ่ม (ราคา Ask ต่ำกว่าไม้ Buy ล่าสุด >= ระยะจุด)
        if(last_buy_time > 0)
        {
            if(ask <= (last_buy_price - (step_points * point)))
            {  trade.SetExpertMagicNumber(555556);
                if(trade.Buy(lot_size*SPEEDx, sym))
                {
                    //Print("Added BUY on ", sym, " | Last Buy: ", last_buy_price, " | Current Ask: ", ask);
                }
            }
        }

        // 6. ตรวจสอบเงื่อนไขเปิดไม้ Sell เพิ่ม (ราคา Bid สูงกว่าไม้ Sell ล่าสุด >= ระยะจุด)
        if(last_sell_time > 0)
        {
            if(bid >= (last_sell_price + (step_points * point)))
            {  trade.SetExpertMagicNumber(555556);
                if(trade.Sell(lot_size*SPEEDx, sym))
                {
                    //Print("Added SELL on ", sym, " | Last Sell: ", last_sell_price, " | Current Bid: ", bid);
                }
            }
        }
    }
    trade.SetExpertMagicNumber(magicnumber);
}
void closeallsys() {
   trade.SetAsyncMode(true);
   for(int cnt = PositionsTotal() - 1; cnt >= 0; cnt--) {
      ulong ticket = PositionGetTicket(cnt);
      if(PositionGetInteger(POSITION_MAGIC) != magicnumber && PositionGetInteger(POSITION_MAGIC) != 555556) continue;
         if(ticket > 0) trade.PositionClose(ticket);
   } 
}
bool countsys() {
   for(int cnt = PositionsTotal() - 1; cnt >= 0; cnt--) {
      ulong ticket = PositionGetTicket(cnt);
      if(PositionGetInteger(POSITION_MAGIC) == magicnumber) {return true;}
   } 
   return false;
}
