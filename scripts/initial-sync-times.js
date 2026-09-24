const { createClient } = require('@supabase/supabase-js');

const url = 'https://kvkynlselomdgmoalhis.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a3lubHNlbG9tZGdtb2FsaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMzY3OTYsImV4cCI6MjA2NTcxMjc5Nn0.Z06ZYj4n7qhb4D9NqYUg5k_08nP2vSx_DRiPRPxSksk';
const supabase = createClient(url, key);

const REMAINING_TIME_SLOTS = [
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function isTaskSkipped(task) {
  if (!task || !task.status) return false;
  const s = task.status.toLowerCase().trim();
  return s === "skipped" || s.includes("skipped");
}

async function run() {
  console.log("Fetching tasks for current week (2026-09-21 to 2026-09-27)...");
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .or('and(start_date.gte.2026-09-21,start_date.lte.2026-09-27),and(end_date.gte.2026-09-21,end_date.lte.2026-09-27),and(start_date.lte.2026-09-21,end_date.gte.2026-09-27)');

  if (error) {
    console.error("Fetch error:", error);
    process.exit(1);
  }

  console.log(`Found ${tasks.length} tasks.`);
  const updates = [];

  const multiDayList = [];
  const singleDayList = [];

  tasks.forEach((t) => {
    if (t.start_date !== t.end_date) {
      multiDayList.push(t);
    } else {
      singleDayList.push(t);
    }
  });

  // 1. Multi-day tasks get 09:00
  multiDayList.forEach((t) => {
    updates.push({ id: t.id, start_time: "09:00", title: t.title, type: "multi-day" });
  });

  // 2. Single-day tasks grouped by start_date
  const singleByDate = {};
  singleDayList.forEach((t) => {
    if (!singleByDate[t.start_date]) singleByDate[t.start_date] = [];
    singleByDate[t.start_date].push(t);
  });

  Object.entries(singleByDate).forEach(([dateStr, dayTasks]) => {
    const activeTasks = dayTasks.filter((t) => !isTaskSkipped(t));
    const skippedTasks = dayTasks.filter((t) => isTaskSkipped(t));

    const remainingActive = [];
    const slotMap = {};

    activeTasks.forEach((t) => {
      let placed = false;
      for (const slot of REMAINING_TIME_SLOTS) {
        const regexDot = new RegExp(`^${slot.replace(":", "\\.")}`, "i");
        const regexColon = new RegExp(`^${slot}`, "i");
        if (regexDot.test(t.title) || regexColon.test(t.title)) {
          updates.push({ id: t.id, start_time: slot, title: t.title, type: "single-day explicit" });
          if (!slotMap[slot]) slotMap[slot] = [];
          slotMap[slot].push(t);
          placed = true;
          break;
        }
      }
      if (!placed) remainingActive.push(t);
    });

    let sIdx = 0;
    remainingActive.forEach((t) => {
      const slot = REMAINING_TIME_SLOTS[sIdx % REMAINING_TIME_SLOTS.length];
      updates.push({ id: t.id, start_time: slot, title: t.title, type: "single-day regular" });
      sIdx++;
    });

    // Skipped tasks placed at bottom slots (17:00, 16:00, ...)
    const lastSlotIndex = REMAINING_TIME_SLOTS.length - 1;
    skippedTasks.forEach((t, i) => {
      const targetSlotIndex = Math.max(0, lastSlotIndex - (i % REMAINING_TIME_SLOTS.length));
      const slot = REMAINING_TIME_SLOTS[targetSlotIndex];
      updates.push({ id: t.id, start_time: slot, title: t.title, type: "single-day skipped" });
    });
  });

  console.log(`Starting to update ${updates.length} tasks in Supabase...`);
  let successCount = 0;
  for (const item of updates) {
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({ start_time: item.start_time })
      .eq('id', item.id);

    if (updateErr) {
      console.error(`Failed to update ${item.id} (${item.title}):`, updateErr.message);
    } else {
      successCount++;
    }
  }

  console.log(`Successfully updated ${successCount} / ${updates.length} tasks with start_time!`);
}

run();
