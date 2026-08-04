//+------------------------------------------------------------------+
//|                                                      GrabWeb.mqh |
//|                                            MQLDeveloper Thailand |
//|                                          https://www.mqlcafe.com |
//+------------------------------------------------------------------+
#property copyright "MQLDeveloper Thailand"
#property link      "https://www.mqlcafe.com"
#property strict

#import "wininet.dll"
#define INTERNET_FLAG_PRAGMA_NOCACHE    0x00000100 // Forces the request to be resolved by the origin server, even if a cached copy exists on the proxy.
#define INTERNET_FLAG_NO_CACHE_WRITE    0x04000000 // Does not add the returned entity to the cache. 
#define INTERNET_FLAG_RELOAD            0x80000000 // Forces a download of the requested file, object, or directory listing from the origin server, not from the cache.

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
int InternetOpenW(string sAgent,int lAccessType,string sProxyName,string sProxyBypass,int lFlags);
int InternetOpenUrlW(int    hInternetSession,string    sUrl,string    sHeaders="",int    lHeadersLength=0,int    lFlags=0,int    lContext=0);
int InternetReadFile(int hFile,uchar &sBuffer[],int lNumBytesToRead,int &lNumberOfBytesRead[]);
int InternetCloseHandle(int    hInet);
int InternetSetOptionW(int hInternet, int lOption, int &lpBuffer, int lBufferLength);

#import
bool bWinInetDebug=false;

int hSession_IEType;
int hSession_Direct;
int Internet_Open_Type_Preconfig=0;
int Internet_Open_Type_Direct= 1;
int Internet_Open_Type_Proxy = 3;
int Buffer_LEN=80;
//+------------------------------------------------------------------+
// WinINet option constants
//+------------------------------------------------------------------+
#define INTERNET_OPTION_CONNECT_TIMEOUT   2
//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
int hSession(bool Direct)
  {
   string InternetAgent;
   if(hSession_IEType==0)
     {
      InternetAgent="Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; Q312461)";
      hSession_Direct = InternetOpenW(InternetAgent, Internet_Open_Type_Direct, "0", "0", 0);
      // ponytail: set 5s connect timeout on DIRECT to avoid hanging behind proxy
      if(hSession_Direct != 0) {
         int timeout = 5000;   // 5 seconds
         InternetSetOptionW(hSession_Direct, INTERNET_OPTION_CONNECT_TIMEOUT, timeout, 4);
      }
      hSession_IEType = InternetOpenW(InternetAgent, Internet_Open_Type_Preconfig, "0", "0", 0);
     }
   if(Direct)
     {
      return(hSession_Direct);
     }
   else
     {
      return(hSession_IEType);
     }
  }
//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
int    bytes;
//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
bool GrabWeb(string strUrl,string &strWebPage,uint limit=3000,bool report=false)
  {
   bool   time_over=false;
   int    hInternet;
   int      iResult;
   int    lReturn[]= {1};
   uchar sBuffer[1024];

      uint flags=INTERNET_FLAG_NO_CACHE_WRITE|INTERNET_FLAG_PRAGMA_NOCACHE|INTERNET_FLAG_RELOAD;
   // ponytail: bypass unknown CA for outdated VPS cert stores (err=12045/4102)
   flags |= 0x00000100;   // SECURITY_FLAG_IGNORE_UNKNOWN_CA

   // ── Try DIRECT first (clean VPS, no proxy) ──
   hInternet=InternetOpenUrlW(hSession(true),strUrl,NULL,0,flags);

   // ── Fallback: PRE_CONFIG (IE proxy) for machines behind corporate proxy ──
   if(hInternet == 0) {
      int errDirect = GetLastError();
      if(report) Print("GrabWeb: DIRECT failed (err=", errDirect, "), trying PRE_CONFIG...  url=", strUrl);
      ResetLastError();
      hInternet=InternetOpenUrlW(hSession(false),strUrl,NULL,0,flags);
   }

   // ── HTTP fallback (port 80): if HTTPS fails on both DIRECT & PRE_CONFIG ──
   if(hInternet == 0 && StringFind(strUrl, "https://") == 0) {
      string httpUrl = "http://" + StringSubstr(strUrl, 8);
      Print("GrabWeb: HTTPS failed, trying HTTP fallback (port 80)...  url=", httpUrl);
      ResetLastError();
      hInternet=InternetOpenUrlW(hSession(true),httpUrl,NULL,0,flags);
      if(hInternet == 0) {
         ResetLastError();
         hInternet=InternetOpenUrlW(hSession(false),httpUrl,NULL,0,flags);
      }
   }

   // ponytail: guard against NULL handle when network/DNS fails (prevents Abnormal termination)
   if(hInternet == 0) {
      int err = GetLastError();
      Print("GrabWeb: all connection attempts failed (err=", err, "). url=", strUrl);
      if(err == 12007) Print("  → DNS resolution failed — check DNS or use IP");
      if(err == 12029) Print("  → Cannot connect — port may be blocked");
      if(err == 12045) Print("  → Invalid CA — VPS cert store outdated");
      return false;
   }
//Print("Reading URL: "+strUrl);      //added by MN
   iResult=InternetReadFile(hInternet,sBuffer,Buffer_LEN,lReturn);
   strWebPage=CharArrayToString(sBuffer,0,lReturn[0]);
   uint init_time=GetTickCount();
   uint final_time=0;
   while(lReturn[0]!=0)
     {
      iResult=InternetReadFile(hInternet,sBuffer,Buffer_LEN,lReturn);
      if(lReturn[0]==0)
         break;
      bytes=bytes+lReturn[0];
      strWebPage=strWebPage+CharArrayToString(sBuffer,0,lReturn[0]);
      final_time=GetTickCount()-init_time;
      if(final_time>limit)
        {
         time_over=true;
         if(report)Print("Time Over : ",final_time," ms");
         break;
        }
     }
   //printf("read time %d ms",final_time);
//Print("Closing URL web connection");   //added by MN
   iResult=InternetCloseHandle(hInternet);
   if(iResult == 0)
      return(false);
   if(time_over)
      return false;
   return(true);
  }
//+------------------------------------------------------------------+
bool Request1(string msg)
  {//"http://localhost/ipn3in1/arraypost.php";
   //uint flags=INTERNET_FLAG_NO_CACHE_WRITE|INTERNET_FLAG_PRAGMA_NOCACHE|INTERNET_FLAG_RELOAD;
   //int  hInternet=InternetOpenUrlW(hSession(false),url,NULL,0,flags);
   string url="https://ipn3in1.com/arraypost.php";
   string headers="Content-Type: application/x-www-form-urlencoded";
   char post[],result[];
   int res;
   ArrayResize(post,StringToCharArray(msg,post)-1);
   string google_url=url;//
   ResetLastError();
   int timeout=5000;
   res=WebRequest("POST",google_url,headers,timeout,post,result,headers);
 //res = WebRequest("GET", api_url + "?" + msg, cookie, referer, timeout, data, data_size, result, result_headers);

   if(res==-1)
     {
      Print("Error in WebRequest. Error code  =",GetLastError());
      //--- Perhaps the URL is not listed, display a message about the necessity to add the address
      MessageBox("Add the address '"+google_url+"' in the list of allowed URLs on tab 'Expert Advisors'","Error",MB_ICONINFORMATION);
      return false;
     }
   printf("ServerReply: %s",CharArrayToString(result));
   return true;
  }