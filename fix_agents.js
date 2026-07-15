const fs = require('fs');
const main = fs.readFileSync('src/app/admin/AdminClient.tsx', 'utf8');

const snip = `
        {activeTab === "agents" && (
          <div className="rounded-xl bg-white shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-black">🏷️ ตัวแทน ({agentList.length})</h2>
              <button onClick={() => { setShowAddAgent(true); setAgentForm({ agent_code: "", name: "", email: "", discount_percent: 0, commission_percent: 0, commission_earned: 0, commission_paid: 0, created_at: "" }); }} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">+ เพิ่ม</button>
            </div>

            {showAddAgent && (
              <form onSubmit={handleSaveAgent} className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-3">
                <input value={agentForm.agent_code} onChange={e => setAgentForm({...agentForm, agent_code: e.target.value})} placeholder="รหัส (เช่น JOHN20)" className="rounded border px-2 py-1 text-sm text-black" required />
                <input value={agentForm.name} onChange={e => setAgentForm({...agentForm, name: e.target.value})} placeholder="ชื่อตัวแทน" className="rounded border px-2 py-1 text-sm text-black" required />
                <input value={agentForm.email} onChange={e => setAgentForm({...agentForm, email: e.target.value})} placeholder="Gmail" className="rounded border px-2 py-1 text-sm text-black" required />
                <input value={agentForm.discount_percent || ""} onChange={e => setAgentForm({...agentForm, discount_percent: Number(e.target.value)})} placeholder="ส่วนลด %" type="number" className="rounded border px-2 py-1 text-sm text-black" />
                <input value={agentForm.commission_percent || ""} onChange={e => setAgentForm({...agentForm, commission_percent: Number(e.target.value)})} placeholder="ค่าคอม %" type="number" className="rounded border px-2 py-1 text-sm text-black" />
                <div className="flex gap-2">
                  <button type="submit" disabled={agentSaving} className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50">{agentSaving ? "..." : "บันทึก"}</button>
                  <button type="button" onClick={() => setShowAddAgent(false)} className="rounded border border-zinc-200 px-3 py-1 text-sm text-black">ยกเลิก</button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-black">
                    <th className="px-2 py-1">รหัส</th>
                    <th className="px-2 py-1">ชื่อ</th>
                    <th className="px-2 py-1">ส่วนลด</th>
                    <th className="px-2 py-1">ค่าคอม</th>
                    <th className="px-2 py-1 text-right">ยอดสะสม</th>
                    <th className="px-2 py-1 text-right">จ่ายแล้ว</th>
                    <th className="px-2 py-1 text-right">คงค้าง</th>
                    <th className="px-2 py-1 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {agentList.map(a => {
                    const pending = a.commission_earned - a.commission_paid;
                    return (
                      <tr key={a.agent_code} className="border-b border-zinc-100">
                        <td className="px-2 py-1 font-medium text-black">{a.agent_code}</td>
                        <td className="px-2 py-1 text-black">{a.name}</td>
                        <td className="px-2 py-1 text-black">{a.discount_percent}%</td>
                        <td className="px-2 py-1 text-black">{a.commission_percent}%</td>
                        <td className="px-2 py-1 text-right text-black">฿{a.commission_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right text-green-600">฿{a.commission_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right text-amber-600">฿{pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1 text-right space-x-1">
                          {pending > 0 && (
                            <button onClick={() => handleMarkPaid(a.agent_code)} disabled={markingPaid === a.agent_code}
                              className="rounded bg-green-600 px-2 py-0.5 text-xs text-white disabled:opacity-50">
                              {markingPaid === a.agent_code ? "..." : "จ่ายแล้ว"}
                            </button>
                          )}
                          <button onClick={() => { setAgentForm(a); setShowAddAgent(true); }} className="text-xs text-blue-500 hover:text-blue-700">✏️</button>
                          <button onClick={() => handleDeleteAgent(a.agent_code)} className="text-xs text-red-500 hover:text-red-700">🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                  {agentList.length === 0 && (
                    <tr><td colSpan={8} className="px-2 py-4 text-center text-zinc-400">{t("no_data")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}`;

const result = main.replace('      </main>', snip + '\n      </main>');
fs.writeFileSync('src/app/admin/AdminClient.tsx', result);
console.log('OK');
