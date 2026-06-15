// ── i18n Translation Dictionary (TH/EN) ──
// usage: import { t } from "@/lib/i18n";  t("key", lang)

export type Lang = "th" | "en";

export type TKey = keyof typeof translations;

export const translations = {
  // ── Common ──
  app_title: { th: "MT5 License Manager", en: "MT5 License Manager" },
  app_description: { th: "ระบบจัดการสมาชิกและพอร์ต MT5", en: "MT5 Member & Port Manager" },
  dashboard: { th: "Dashboard", en: "Dashboard" },
  my_portfolio: { th: "MyPortfolio", en: "MyPortfolio" },
  admin_panel: { th: "Admin Panel", en: "Admin Panel" },
  loading: { th: "กำลังดำเนินการ...", en: "Loading..." },
  error_occurred: { th: "เกิดข้อผิดพลาด", en: "An error occurred" },
  back_to_dashboard: { th: "← กลับ Dashboard", en: "← Back to Dashboard" },
  cancel: { th: "ยกเลิก", en: "Cancel" },
  save: { th: "บันทึก", en: "Save" },
  saving: { th: "กำลังบันทึก...", en: "Saving..." },
  delete: { th: "ลบ", en: "Delete" },
  yes: { th: "ใช่", en: "Yes" },
  no: { th: "ไม่", en: "No" },
  confirm: { th: "ยืนยัน", en: "Confirm" },
  close: { th: "ปิด", en: "Close" },
  edit: { th: "แก้ไข", en: "Edit" },
  status: { th: "สถานะ", en: "Status" },
  days_left: { th: "วันคงเหลือ", en: "Days Left" },
  expiry_date: { th: "วันหมดอายุ", en: "Expiry Date" },
  expired: { th: "หมดอายุแล้ว", en: "Expired" },
  active: { th: "active", en: "active" },
  removed: { th: "removed", en: "removed" },
  no_data: { th: "ยังไม่มีรายการ", en: "No data yet" },
  saving_success: { th: "✅ บันทึกสำเร็จ", en: "✅ Saved successfully" },
  save_failed: { th: "❌ บันทึกไม่สำเร็จ", en: "❌ Save failed" },
  sign_out: { th: "ออกจากระบบ", en: "Sign out" },
  gmail_only: { th: "เฉพาะบัญชี @gmail.com เท่านั้น", en: "Gmail accounts only" },
  add_success: { th: "เพิ่ม {account} แล้ว", en: "Added {account}" },
  delete_success: { th: "ลบแล้ว", en: "Deleted" },
  delete_failed: { th: "ลบไม่สำเร็จ", en: "Delete failed" },

  // ── Landing Page ──
  landing_subtitle: {
    th: "จัดการพอร์ต MT5 ของคุณ — ดูภาพรวมกำไร/ขาดทุนได้ในหน้าต่างเดียว",
    en: "Manage your MT5 ports — view profit/loss overview in one window",
  },
  signup: { th: "สมัครสมาชิก", en: "Sign up" },

  // ── Login Page ──
  login_title: { th: "ล็อคอิน", en: "Sign in" },
  login_dashboard_desc: {
    th: "ล็อคอินด้วย Gmail เพื่อจัดการพอร์ต MT5 ของคุณ",
    en: "Sign in with Gmail to manage your MT5 ports",
  },
  login_portfolio_desc: {
    th: "ล็อคอินด้วย Gmail เพื่อดูพอร์ตการลงทุนของคุณ",
    en: "Sign in with Gmail to view your investment portfolio",
  },
  sign_in_google: { th: "Sign in with Google", en: "Sign in with Google" },

  // ── Dashboard ──
  port_count: { th: "พอร์ตของคุณ ({count})", en: "Your Ports ({count})" },
  no_ports_yet: {
    th: "ยังไม่มีพอร์ต — เพิ่มพอร์ตแรกของคุณ",
    en: "No ports yet — add your first port",
  },
  no_ports_hint: {
    th: "หลังจากเพิ่มแล้ว ให้ติดตั้ง EA เพื่อส่งข้อมูลอัปเดต",
    en: "After adding, install the EA to send updates",
  },
  add_port: { th: "+ เพิ่มพอร์ต", en: "+ Add Port" },
  add_port_form: { th: "เพิ่มพอร์ต MT5", en: "Add MT5 Port" },
  mt5_account_placeholder: { th: "หมายเลข MT5 Account", en: "MT5 Account Number" },
  broker: { th: "โบรคเกอร์", en: "Broker" },
  select_broker: { th: "-- เลือกโบรคเกอร์ --", en: "-- Select Broker --" },
  adding: { th: "กำลังเพิ่ม...", en: "Adding..." },
  add: { th: "เพิ่ม", en: "Add" },
  port_add_success: { th: "เพิ่ม {account} แล้ว", en: "Added {account}" },
  port_add_exists: { th: "เบอร์นี้มีอยู่ในระบบแล้ว", en: "This account already exists" },
  port_add_failed: { th: "เพิ่มไม่สำเร็จ", en: "Add failed" },
  port_limit_reached: { th: "คุณเพิ่มพอร์ตครบตามแพคเกจแล้ว", en: "You have reached your port limit" },
  delete_port_confirm: {
    th: "ต้องการลบพอร์ตที่กำลังรันอยู่ออกหรือไม่?",
    en: "Remove this running port?",
  },
  delete_yes: { th: "ใช่ ลบเลย", en: "Yes, delete" },
  delete_no: { th: "ไม่", en: "No" },

  // Port status
  login_first: { th: "กรุณา Login ก่อน", en: "Please login first" },
  system_configure: { th: "ตั้งค่าระบบ", en: "Configure System" },
  systems_selected: { th: "ระบบที่เลือก: {system}", en: "Selected: {system}" },
  systems_none: { th: "ยังไม่ได้เลือกระบบ (ลูกค้าจะใช้ EA เอง)", en: "No system selected (customer uses their own EA)" },
  multiplier: { th: "ตัวคูณ", en: "Multiplier" },
  no_system_option: { th: "-- ไม่เลือก (ลูกค้าใช้ EA เอง) --", en: "-- None (customer uses own EA) --" },

  // Payment
  upload_slip: { th: "อัปโหลดสลิป", en: "Upload Slip" },
  upload_slip_for: { th: "อัปโหลดสลิปสำหรับ {txn}", en: "Upload slip for {txn}" },
  select_file: { th: "เลือกไฟล์", en: "Select file" },
  uploading: { th: "กำลังอัปโหลด...", en: "Uploading..." },
  upload: { th: "อัปโหลด", en: "Upload" },
  slip_upload_success: { th: "อัปโหลดสลิปสำเร็จ", en: "Slip uploaded successfully" },
  slip_upload_failed: { th: "อัปโหลดไม่สำเร็จ", en: "Upload failed" },
  cancel_payment: { th: "ยกเลิกรายการ", en: "Cancel Payment" },
  payment_cancelled: { th: "ยกเลิกรายการแล้ว", en: "Payment cancelled" },
  payment_history: { th: "ประวัติการจ่าย", en: "Payment History" },
  payment_history_title: { th: "📋 ประวัติการจ่ายเงิน", en: "📋 Payment History" },
  pending_payments: { th: "รายการรอตรวจสอบ", en: "Pending Payments" },
  no_pending: { th: "ไม่มีรายการรอตรวจสอบ", en: "No pending payments" },
  no_history: { th: "ยังไม่มีประวัติการจ่าย", en: "No payment history" },
  amount: { th: "จำนวนเงิน", en: "Amount" },
  date: { th: "วันที่", en: "Date" },
  package_col: { th: "แพคเกจ", en: "Package" },
  slip_col: { th: "สลิป", en: "Slip" },
  view: { th: "ดู", en: "View" },
  verify: { th: "ยืนยัน", en: "Verify" },
  verifying: { th: "กำลังตรวจสอบ...", en: "Verifying..." },

  // Package display
  package_label: { th: "แพคเกจ", en: "Package" },
  expiry: { th: "หมดอายุ", en: "Expires" },
  your_package: { th: "แพคเกจของคุณ", en: "Your Package" },
  renew: { th: "🔐 ต่ออายุ", en: "🔐 Renew" },
  upgrade: { th: "⬆ อัปเกรด", en: "⬆ Upgrade" },

  // Add-on
  ib_vps_addon: { th: "IB+VPS", en: "IB+VPS" },
  ib_vps_label: { th: "IB+VPS Add-on", en: "IB+VPS Add-on" },

  // ── Renew Page ──
  renew_title: { th: "🔐 ต่ออายุแพคเกจ", en: "🔐 Renew Package" },
  renew_select: { th: "เลือกแพคเกจที่ต้องการ", en: "Select the package you want" },
  activate_free: { th: "🎁 เปิดใช้งานฟรี", en: "🎁 Activate Free" },
  apply_line_oa: { th: "📱 สมัครผ่าน Line OA", en: "📱 Apply via Line OA" },
  create_qr: { th: "💳 สร้าง QR ชำระเงิน", en: "💳 Create QR Payment" },
  free_label: { th: "ฟรี", en: "Free" },
  unlimited: { th: "Unlimited", en: "Unlimited" },
  port_suffix: { th: "พอร์ต", en: "ports" },
  free_ib_lifetime: { th: "ฟรี + IB ตลอดชีพ", en: "Free + IB Lifetime" },
  choose_new_package: { th: "← เลือกแพคเกจใหม่", en: "← Choose new package" },

  // QR Payment
  qr_payment_title: { th: "💳 ชำระเงิน", en: "💳 Payment" },
  qr_expires_in: { th: "QR หมดอายุใน {time}", en: "QR expires in {time}" },
  qr_expired: { th: "⏰ หมดเวลา — กรุณาสร้าง QR ใหม่", en: "⏰ Time expired — create new QR" },
  qr_amount: { th: "จำนวนเงิน: ฿{amount}", en: "Amount: ฿{amount}" },
  checking_status: { th: "กำลังตรวจสอบสถานะ...", en: "Checking status..." },
  payment_success: {
    th: "✅ ชำระเงินสำเร็จ! กำลังพาไป Dashboard...",
    en: "✅ Payment successful! Redirecting to Dashboard...",
  },
  uploading_slip_title: { th: "📎 อัปโหลดสลิป", en: "📎 Upload Slip" },

  // ── Portfolio Page ──
  portfolio_your_ports: { th: "พอร์ตของคุณ ({count})", en: "Your Ports ({count})" },
  portfolio_add_btn: { th: "+ เพิ่มพอร์ต", en: "+ Add Port" },
  portfolio_close_btn: { th: "✕ ปิด", en: "✕ Close" },
  portfolio_account_placeholder: { th: "หมายเลข MT5 Account", en: "MT5 Account Number" },
  portfolio_adding: { th: "กำลังเพิ่ม...", en: "Adding..." },
  portfolio_add: { th: "เพิ่ม", en: "Add" },
  portfolio_empty: {
    th: "ยังไม่มีพอร์ต — เพิ่มพอร์ตแรกของคุณ",
    en: "No portfolio yet — add your first account",
  },
  portfolio_empty_hint: {
    th: "หลังจากเพิ่มแล้ว ให้ติดตั้ง EA เพื่อส่งข้อมูลอัปเดต",
    en: "After adding, install the EA to send updates",
  },
  balance: { th: "Balance", en: "Balance" },
  float_pl: { th: "Float P/L", en: "Float P/L" },
  total_profit: { th: "Total Profit", en: "Total Profit" },
  last_updated: { th: "อัปเดตล่าสุด", en: "Last updated" },
  waiting_update: { th: "รออัปเดต", en: "Waiting for update" },
  delete_port: { th: "ลบพอร์ต", en: "Delete port" },
  delete_port_confirm_q: { th: "ยืนยันการลบพอร์ตนี้?", en: "Confirm delete this port?" },
  port_added: { th: "เพิ่ม {account} แล้ว", en: "Added {account}" },
  delete_not_successful: { th: "ลบไม่สำเร็จ", en: "Delete failed" },

  // ── Admin Page ──
  admin_no_access: { th: "⛔ ไม่มีสิทธิ์เข้าใช้งาน", en: "⛔ Access Denied" },
  admin_only: { th: "เฉพาะแอดมินเท่านั้น", en: "Admins only" },
  admin_back_dashboard: { th: "กลับไป Dashboard", en: "Back to Dashboard" },

  // Admin tabs
  tab_members: { th: "สมาชิก", en: "Members" },
  tab_ports: { th: "พอร์ต", en: "Ports" },
  tab_payments: { th: "การจ่ายเงิน", en: "Payments" },
  tab_whitelist: { th: "Whitelist", en: "Whitelist" },

  // Admin - Members
  email: { th: "อีเมล", en: "Email" },
  name: { th: "ชื่อ", en: "Name" },
  package_small: { th: "แพคเกจ", en: "Package" },
  ports_small: { th: "พอร์ต", en: "Ports" },
  actions: { th: "", en: "" },
  not_set: { th: "ไม่กำหนด", en: "Not set" },
  member_saved: { th: "✅ อัปเดตสมาชิกแล้ว", en: "✅ Member updated" },

  // Admin - Ports
  port_id: { th: "ID", en: "ID" },
  account: { th: "Account", en: "Account" },
  owner: { th: "เจ้าของ", en: "Owner" },
  system: { th: "ระบบ", en: "System" },

  // Admin - Payments
  payment_id: { th: "Txn ID", en: "Txn ID" },
  payment_package: { th: "แพคเกจ", en: "Package" },
  payment_amount: { th: "จำนวน", en: "Amount" },
  payment_status: { th: "สถานะ", en: "Status" },
  paid: { th: "✅ จ่ายแล้ว", en: "✅ Paid" },
  failed: { th: "❌ ล้มเหลว", en: "❌ Failed" },
  pending: { th: "⏳ รอตรวจสอบ", en: "⏳ Pending" },
  admin_verify: { th: "✅ ยืนยัน", en: "✅ Verify" },
  admin_cancel: { th: "❌ ยกเลิก", en: "❌ Cancel" },

  // Admin - Whitelist
  wl_name: { th: "ชื่อ-สกุล", en: "Full Name" },
  wl_broker: { th: "Broker", en: "Broker" },
  wl_date_added: { th: "วันที่เพิ่ม", en: "Date Added" },
  wl_add: { th: "✅ เพิ่ม", en: "✅ Add" },
  wl_added: { th: "✅ เพิ่ม whitelist แล้ว", en: "✅ Whitelist added" },
  wl_add_failed: { th: "❌ เพิ่มไม่สำเร็จ", en: "❌ Add failed" },
  wl_deleted: { th: "✅ ลบแล้ว", en: "✅ Removed" },
  wl_delete_failed: { th: "❌ ลบไม่สำเร็จ", en: "❌ Remove failed" },
  wl_empty: { th: "ยังไม่มีรายการ", en: "No entries yet" },

  // ── VPS / Systems status ──
  systems_config: { th: "ตั้งค่าระบบ OneComplete", en: "OneComplete System Config" },
  login_mt5: { th: "Login MT5", en: "MT5 Login" },
  password: { th: "รหัสผ่าน", en: "Password" },
  login: { th: "Login", en: "Login" },
  login_ok: { th: "✅ Login สำเร็จ", en: "✅ Login OK" },
  login_fail: { th: "❌ Login ไม่สำเร็จ", en: "❌ Login Failed" },
  login_checking: { th: "กำลังตรวจสอบ...", en: "Checking..." },

  // ── Package names (short) ──
  pkg_none: { th: "ไม่มีแพคเกจ", en: "None" },
  pkg_free: { th: "ฟรี", en: "Free" },
  pkg_free_ib: { th: "⭐ ฟรี+IB", en: "⭐ Free+IB" },
  pkg_test_1: { th: "ทดสอบ", en: "Test" },
  pkg_basic: { th: "Basic", en: "Basic" },
  pkg_premium: { th: "Premium", en: "Premium" },
  pkg_vip: { th: "💎 VIP", en: "💎 VIP" },
  pkg_ib_vps: { th: "IB+VPS 1Y", en: "IB+VPS 1Y" },
  pkg_live_with_us: { th: "Live With Us", en: "Live With Us" },

  // ── Package labels (full) ──
  pkg_label_none: { th: "ไม่มีแพคเกจ", en: "No Package" },
  pkg_label_free: { th: "ฟรี 7 วัน", en: "Free 7 Days" },
  pkg_label_free_ib: { th: "⭐ ฟรี + IB ตลอดชีพ (Unlimited)", en: "⭐ Free + IB Lifetime (Unlimited)" },
  pkg_label_test_1: { th: "🧪 1 บาท / 3 วัน", en: "🧪 1 THB / 3 Days" },
  pkg_label_basic: { th: "30 วัน + VPS (2 พอร์ต) | ใช้ได้ทุกโบรค", en: "30d + VPS (2 Ports) | Any Broker" },
  pkg_label_premium: { th: "90 วัน + VPS (5 พอร์ต) | ใช้ได้ทุกโบรค", en: "90d + VPS (5 Ports) | Any Broker" },
  pkg_label_vip: { th: "💎 1 ปี + VPS (9 พอร์ต) | ใช้ได้ทุกโบรค", en: "💎 1Y + VPS (9 Ports) | Any Broker" },
  pkg_label_ib_vps: { th: "vCPU 2 / RAM 4GB / 1 ปี", en: "vCPU 2 / RAM 4GB / 1 Year" },
  pkg_label_live_with_us: { th: "Lifetime + VPS | ใช้ได้ทุกโบรค | รับประกัน 2 ปี", en: "Lifetime + VPS | Any Broker | Guarantee 2Y" },

  // ── Renew extras ──
  select_package_first: { th: "กรุณาเลือกแพคเกจก่อน", en: "Please select a package first" },
  scan_qr_to_pay: { th: "สแกน QR Code เพื่อชำระเงิน", en: "Scan QR code to pay" },
  or_label: { th: "หรือ", en: "or" },
  creating_qr: { th: "กำลังสร้าง QR...", en: "Creating QR..." },
  cancel_transaction: { th: "ยกเลิกรายการ", en: "Cancel transaction" },
  admin_verify_label: { th: "Admin Verify", en: "Admin Verify" },
  admin_verify_failed: { th: "Admin verify failed", en: "Admin verify failed" },
  countdown: { th: "นับถอยหลัง", en: "Countdown" },
  slip_upload_hint: { th: "หากชำระแล้ว กรุณาอัปโหลดสลิป", en: "If paid, please upload your slip" },
  total_amount: { th: "รวม: ฿{amount}", en: "Total: ฿{amount}" },
  expires_at_label: { th: "หมดอายุ:", en: "Expires:" },
  activate_now: { th: "เปิดใช้งาน", en: "Activate" },
  renew_success_title: { th: "ต่ออายุสำเร็จ!", en: "Renewal Successful!" },
  vps_connect_failed: { th: "เชื่อมต่อ VPS ไม่ได้", en: "Cannot connect to VPS" },
  port_status_check_failed: { th: "ไม่สามารถตรวจสอบสถานะพอร์ตได้", en: "Cannot check port status" },
  port_already_used: { th: "พอร์ตนี้ถูกใช้โดยสมาชิกอื่นแล้ว", en: "This port is already used by another member" },
  cannot_check_port_status: { th: "ไม่สามารถเชื่อมต่อเพื่อตรวจสอบสถานะพอร์ตได้", en: "Cannot connect to verify port status" },
  manage: { th: "จัดการ", en: "Manage" },
  sign_out_short: { th: "ออก", en: "Out" },
  submit_slip: { th: "📤 ส่งสลิป", en: "📤 Submit Slip" },
  upload_slip_desc: { th: "อัปโหลดรูปสลิปการโอนเงิน", en: "Upload payment slip image" },
  payment_history_with_count: { th: "📋 ประวัติการชำระเงิน ({count} รายการ)", en: "📋 Payment History ({count} items)" },
  pending_payment_title: { th: "📎 รายการรอชำระเงิน", en: "📎 Pending Payments" },
  pending_action: { th: "⏳ รอดำเนินการ", en: "⏳ Pending" },
  package_info: { th: "📦 แพคเกจของคุณ", en: "📦 Your Package" },
  add_port_success: { th: "✅ เพิ่มพอร์ต {account} สำเร็จ", en: "✅ Port {account} added successfully" },
  login_success: { th: "Login สำเร็จ", en: "Login successful" },
  login_fail_short: { th: "Login ไม่สำเร็จ", en: "Login failed" },

  // ── Admin tabs ──
  admin_tab_members: { th: "👥 สมาชิก", en: "👥 Members" },
  admin_tab_ports: { th: "🔌 พอร์ต", en: "🔌 Ports" },
  admin_tab_payments: { th: "💰 รอตรวจสอบ", en: "💰 Pending" },
  admin_tab_whitelist: { th: "⭐ Whitelist", en: "⭐ Whitelist" },
  admin_member_count: { th: "👥 สมาชิก ({count})", en: "👥 Members ({count})" },
  admin_port_count: { th: "🔌 พอร์ต ({count})", en: "🔌 Ports ({count})" },
  admin_payment_count: { th: "💰 รอตรวจสอบ ({count})", en: "💰 Pending ({count})" },
  admin_whitelist_count: { th: "⭐ Whitelist ({count})", en: "⭐ Whitelist ({count})" },

  // ── Admin table headers ──
  admin_col_email: { th: "อีเมล", en: "Email" },
  admin_col_package: { th: "แพคเกจ", en: "Package" },
  admin_col_quota: { th: "โควต้า", en: "Quota" },
  admin_col_expiry: { th: "หมดอายุ", en: "Expiry" },
  admin_col_ports: { th: "พอร์ต", en: "Ports" },
  admin_col_manage: { th: "จัดการ", en: "Manage" },
  admin_col_account: { th: "MT5 Account", en: "MT5 Account" },
  admin_col_date_added: { th: "วันที่เพิ่ม", en: "Date Added" },
  admin_col_owner: { th: "เจ้าของ", en: "Owner" },
  admin_col_time: { th: "เวลา", en: "Time" },
  admin_col_amount: { th: "จำนวน", en: "Amount" },

  // ── Admin messages ──
  admin_update_success: { th: "✅ อัปเดต {email} สำเร็จ", en: "✅ Updated {email} successfully" },

  // ── Dashboard cards & table ──
  dash_package: { th: "แพคเกจ", en: "Package" },
  dash_quota: { th: "โควต้าพอร์ต", en: "Port Quota" },
  dash_remaining: { th: "{n} เหลือ", en: "{n} left" },
  dash_expired_label: { th: "❌ หมดอายุแล้ว", en: "❌ Expired" },
  dash_days_left: { th: "✅ เหลือ {n} วัน", en: "✅ {n} days left" },
  dash_no_package: { th: "ไม่มีแพคเกจ", en: "No package" },
  dash_your_ports: { th: "🔌 พอร์ต MT5 ของคุณ", en: "🔌 Your MT5 Ports" },
  dash_pkg_expired_hint: { th: "แพคเกจหมดอายุ — ติดต่อแอดมินเพื่อต่ออายุ", en: "Package expired — contact admin to renew" },
  dash_no_ports_hint2: { th: "ยังไม่มีพอร์ต — กด + เพิ่มพอร์ต เพื่อเพิ่ม", en: "No ports — press + Add Port" },
  dash_no_pkg_hint2: { th: "ยังไม่มีแพคเกจ — ติดต่อแอดมิน", en: "No package — contact admin" },
  dash_save_btn: { th: "💾 บันทึก", en: "💾 Save" },
  dash_delete_btn: { th: "🗑 ลบ", en: "🗑 Delete" },
  dash_col_date: { th: "วันที่", en: "Date" },
  dash_col_expiry: { th: "หมดอายุ", en: "Expiry" },
  dash_col_select: { th: "เลือก", en: "Select" },
  dash_col_run: { th: "ฝากรัน", en: "VPS" },
  dash_upload_slip: { th: "📎 อัปโหลดสลิป", en: "📎 Upload Slip" },
  dash_upload_slip_hint: { th: "อัปโหลดรูปสลิปการโอนเงิน", en: "Upload payment slip" },
  dash_payment_history: { th: "📋 ประวัติการชำระเงิน ({n} รายการ)", en: "📋 Payment History ({n} items)" },
  dash_login_ok_msg: { th: "✓ Login สำเร็จ — รหัสเทรดถูกต้อง", en: "✓ Login success — password correct" },
  dash_baht: { th: "บาท", en: "THB" },
  dash_days: { th: "วัน", en: "days" },
  dash_ib_vps_expiry: { th: "IB+VPS 2200 — หมดอายุ {date}", en: "IB+VPS 2200 — Expires {date}" },

  // ── Port Systems config (Dashboard) ──
  sys_config_title: { th: "ตั้งค่าระบบ — {account}", en: "System Config — {account}" },
  sys_login_hint: { th: "ใส่ Master Password แล้วกด Login เพื่อทดสอบ", en: "Enter Master Password and press Login to test" },
  sys_select_broker: { th: "-- เลือก Broker --", en: "-- Select Broker --" },
  sys_select_system: { th: "เลือกระบบ", en: "Select System" },
  sys_password_label: { th: "รหัสผ่าน MT5", en: "MT5 Password" },
  sys_broker_label: { th: "โบรคเกอร์", en: "Broker" },
  sys_multiplier_label: { th: "ตัวคูณ", en: "Multiplier" },
  sys_no_select: { th: "-- ไม่เลือก (ลูกค้าใช้ EA เอง) --", en: "-- None (client uses own EA) --" },
  sys_selected: { th: "ระบบที่เลือก: {sys}", en: "Selected system: {sys}" },
  sys_not_selected: { th: "ยังไม่ได้เลือกระบบ (ลูกค้าจะใช้ EA เอง)", en: "No system selected (client uses own EA)" },
  sys_testing: { th: "กำลังทดสอบ...", en: "Testing..." },
  sys_login_ok: { th: "✓ ผ่าน", en: "✓ Passed" },
  sys_login_fail: { th: "Login ไม่สำเร็จ — ตรวจสอบรหัสเทรด", en: "Login failed — check trading password" },

  // ── QR / Payment step (renew) ──
  qr_scan_title: { th: "📱 สแกน QR เพื่อชำระเงิน", en: "📱 Scan QR to pay" },
  qr_pay_within: { th: "⏱️ ชำระภายใน", en: "⏱️ Pay within" },
  minutes: { th: "นาที", en: "minutes" },
  upload_slip_alt: { th: "📎 อัปโหลดสลิปแทน", en: "📎 Upload slip instead" },
  cancelling: { th: "กำลังยกเลิก...", en: "Cancelling..." },
  cancel_btn: { th: "❌ ยกเลิก", en: "❌ Cancel" },
  upload_slip_if_paid: { th: "ถ้าโอนเงินแล้ว — อัปโหลดรูปสลิป", en: "If paid — upload payment slip" },
  checking: { th: "กำลังตรวจสอบ...", en: "Checking..." },
  send_slip: { th: "📤 ส่งสลิป", en: "📤 Send Slip" },
  returning_dashboard: { th: "กำลังกลับไปหน้า Dashboard...", en: "Returning to Dashboard..." },
  press_when_paid: { th: "กดปุ่มเมื่อชำระแล้ว", en: "Press after payment" },
  checking_payment: { th: "⏳ กำลังตรวจสอบการชำระเงิน...", en: "⏳ Checking payment..." },
  admin_force_verify: { th: "⚡ Admin: บังคับยืนยันการชำระเงิน", en: "⚡ Admin: Force Verify" },
  contact_line: { th: "ติดต่อ: Line: @harvestfarm", en: "Contact: Line: @harvestfarm" },
  back_select_package: { th: "← เลือกแพคเกจใหม่", en: "← Select new package" },

  // Language switcher
  lang_switch: { th: "EN", en: "TH" },
  lang_label: { th: "ภาษา", en: "Language" },
} as const;

// ── Helper: translate a key ──
export function t(key: TKey, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = translations[key];
  if (!entry) return key;
  let text: string = entry[lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

// ── Get package display info by locale ──
import { PACKAGES, type PackageType, type PackageInfo } from "@/types";

export function getLocalizedPackage(pkgType: PackageType, lang: Lang): PackageInfo {
  const base = PACKAGES[pkgType];
  const nameKey = (
    pkgType === "1000_2m" ? "pkg_basic" :
    pkgType === "2490_3m" ? "pkg_premium" :
    pkgType === "4900_1y" ? "pkg_vip" :
    pkgType === "ib_vps_2200" ? "pkg_ib_vps" :
    pkgType === "live_with_us" ? "pkg_live_with_us" :
    pkgType === "free_ib" ? "pkg_free_ib" :
    pkgType === "test_1" ? "pkg_test_1" :
    pkgType === "free" ? "pkg_free" :
    "pkg_none"
  ) as TKey;

  const labelKey = (
    pkgType === "1000_2m" ? "pkg_label_basic" :
    pkgType === "2490_3m" ? "pkg_label_premium" :
    pkgType === "4900_1y" ? "pkg_label_vip" :
    pkgType === "ib_vps_2200" ? "pkg_label_ib_vps" :
    pkgType === "live_with_us" ? "pkg_label_live_with_us" :
    pkgType === "free_ib" ? "pkg_label_free_ib" :
    pkgType === "test_1" ? "pkg_label_test_1" :
    pkgType === "free" ? "pkg_label_free" :
    "pkg_label_none"
  ) as TKey;

  return {
    ...base,
    name: t(nameKey, lang),
    label: t(labelKey, lang),
  };
}
