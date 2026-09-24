const { createClient } = require('@supabase/supabase-js');

const url = 'https://kvkynlselomdgmoalhis.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a3lubHNlbG9tZGdtb2FsaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMzY3OTYsImV4cCI6MjA2NTcxMjc5Nn0.Z06ZYj4n7qhb4D9NqYUg5k_08nP2vSx_DRiPRPxSksk';
const supabase = createClient(url, key);

async function run() {
  console.log("Fetching tasks for current week (2026-09-21 to 2026-09-27)...");
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, start_date, end_date, start_time, status')
    .or('and(start_date.gte.2026-09-21,start_date.lte.2026-09-27),and(end_date.gte.2026-09-21,end_date.lte.2026-09-27),and(start_date.lte.2026-09-21,end_date.gte.2026-09-27)');

  if (error) {
    console.error("Fetch error:", error);
    process.exit(1);
  }

  console.log(`Found ${tasks.length} tasks in current week.`);

  const updates = [];

  tasks.forEach((t) => {
    let startTime = t.start_time || "10:00";
    let endTime = startTime;

    // Special initial setup for Tuesday 2026-09-22 (Image 2)
    if (t.start_date === "2026-09-22") {
      if (t.title.toLowerCase().includes("chelsea content")) {
        startTime = "13:00";
        endTime = "14:00"; // Spans slot 13:00 through slot 14:00!
      } else if (t.title.toLowerCase().includes("capstone reel")) {
        startTime = "15:00";
        endTime = "15:00";
      } else if (t.title.toLowerCase().includes("check comment")) {
        startTime = "16:00";
        endTime = "16:00";
      } else if (t.title.toLowerCase().includes("post xhs")) {
        startTime = "17:00";
        endTime = "17:00";
      } else if (t.title.toLowerCase().includes("story")) {
        startTime = "17:00";
        endTime = "17:00";
      }
    }

    updates.push({
      id: t.id,
      title: t.title,
      start_time: startTime,
      end_time: endTime,
    });
  });

  console.log(`Prepared ${updates.length} task updates with start_time & end_time.`);

  let successCount = 0;
  let failCount = 0;

  for (const item of updates) {
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({
        start_time: item.start_time,
        end_time: item.end_time,
      })
      .eq('id', item.id);

    if (updateErr) {
      failCount++;
      if (failCount === 1) {
        console.warn(`Supabase notice on update: ${updateErr.message}`);
        if (updateErr.message.includes("end_time")) {
          console.warn("Column 'end_time' does not exist yet in Supabase.");
          console.warn("Please run in Supabase SQL Editor: ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time VARCHAR(10) DEFAULT NULL;");
        }
      }
    } else {
      successCount++;
    }
  }

  console.log(`Sync completed: ${successCount} updated successfully, ${failCount} failed.`);
}

run();
