export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM events ORDER BY date ASC, startTime ASC"
    ).all();
    // allDay は 0/1 で保存されているのでbooleanに変換
    const events = results.map(e => ({ ...e, allDay: e.allDay === 1 }));
    return new Response(JSON.stringify(events), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const e = await request.json();
    await env.DB.prepare(
      "INSERT OR REPLACE INTO events (id, title, date, startTime, endTime, allDay, color, repeat, memo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      e.id, e.title, e.date,
      e.startTime || null, e.endTime || null,
      e.allDay ? 1 : 0,
      e.color, e.repeat,
      e.memo || null,
      e.createdAt || Date.now()
    ).run();
    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  try {
    const e = await request.json();
    await env.DB.prepare(
      "UPDATE events SET title=?, date=?, startTime=?, endTime=?, allDay=?, color=?, repeat=?, memo=? WHERE id=?"
    ).bind(
      e.title, e.date,
      e.startTime || null, e.endTime || null,
      e.allDay ? 1 : 0,
      e.color, e.repeat,
      e.memo || null,
      e.id
    ).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  try {
    const { id } = await request.json();
    await env.DB.prepare("DELETE FROM events WHERE id=?").bind(id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
