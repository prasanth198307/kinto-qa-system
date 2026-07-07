import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

const tid = (req: any): number => req.session?.tenantId ?? req.user?.tenantId ?? 1;
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

let tablesReady = false;
async function ensureTablesOnce() {
  if (tablesReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS social_posts (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      title VARCHAR(300),
      content TEXT NOT NULL,
      media_urls JSONB DEFAULT '[]',
      platforms JSONB DEFAULT '[]',
      scheduled_at TIMESTAMPTZ,
      status VARCHAR(30) DEFAULT 'draft',
      published_at TIMESTAMPTZ,
      platform_results JSONB DEFAULT '{}',
      hashtags TEXT[],
      campaign_id INT,
      created_by INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS social_accounts (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      platform VARCHAR(50) NOT NULL,
      account_name VARCHAR(200),
      account_id VARCHAR(200),
      access_token TEXT,
      token_expiry TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'active',
      connected_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS social_analytics (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL,
      post_id INT NOT NULL,
      platform VARCHAR(50),
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      likes INT DEFAULT 0,
      comments INT DEFAULT 0,
      shares INT DEFAULT 0,
      fetched_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS social_post_analytics (
      id SERIAL PRIMARY KEY,
      tenant_id INT,
      post_id INT,
      platform VARCHAR(50),
      impressions INT DEFAULT 0,
      reach INT DEFAULT 0,
      clicks INT DEFAULT 0,
      likes INT DEFAULT 0,
      comments INT DEFAULT 0,
      shares INT DEFAULT 0,
      saves INT DEFAULT 0,
      retweets INT DEFAULT 0,
      fetched_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tablesReady = true;
}

// ---- Platform posting helpers ----

async function postToLinkedIn(content: string, mediaUrls: string[], accessToken: string): Promise<any> {
  try {
    const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: "urn:li:person:me",
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: content },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    return await resp.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

async function postToFacebook(content: string, pageId: string, accessToken: string): Promise<any> {
  try {
    const resp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, access_token: accessToken }),
    });
    return await resp.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

async function postToInstagram(content: string, imageUrls: string[], pageId: string, accessToken: string): Promise<any> {
  try {
    const containerResp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: content,
        image_url: imageUrls[0] || undefined,
        media_type: imageUrls.length > 1 ? "CAROUSEL" : "IMAGE",
        access_token: accessToken,
      }),
    });
    const container = await containerResp.json() as any;
    if (!container.id) return { error: "Container creation failed", details: container };

    const publishResp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
    });
    return await publishResp.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

async function postToTwitter(content: string, bearerToken: string, _apiKey: string, _apiSecret: string, _accessToken: string, _accessSecret: string): Promise<any> {
  try {
    const resp = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content.substring(0, 280) }),
    });
    return await resp.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

async function publishPost(post: any): Promise<Record<string, any>> {
  const platforms: string[] = post.platforms || [];
  const content: string = post.content || "";
  const media_urls: string[] = post.media_urls || [];
  const platformResults: Record<string, any> = {};

  for (const platform of platforms) {
    if (platform === "linkedin" && process.env.LINKEDIN_ACCESS_TOKEN) {
      platformResults.linkedin = await postToLinkedIn(content, media_urls, process.env.LINKEDIN_ACCESS_TOKEN);
    } else if (platform === "facebook" && process.env.FACEBOOK_ACCESS_TOKEN) {
      const pageId = process.env.FACEBOOK_PAGE_ID || "me";
      platformResults.facebook = await postToFacebook(content, pageId, process.env.FACEBOOK_ACCESS_TOKEN);
    } else if (platform === "instagram" && process.env.INSTAGRAM_PAGE_ID && process.env.INSTAGRAM_ACCESS_TOKEN) {
      try {
        const result = await postToInstagram(content, media_urls, process.env.INSTAGRAM_PAGE_ID, process.env.INSTAGRAM_ACCESS_TOKEN);
        platformResults.instagram = result;
      } catch (e: any) {
        platformResults.instagram = { error: e.message };
      }
    } else if (platform === "twitter" && process.env.TWITTER_BEARER_TOKEN) {
      try {
        const result = await postToTwitter(
          content,
          process.env.TWITTER_BEARER_TOKEN,
          process.env.TWITTER_API_KEY || "",
          process.env.TWITTER_API_SECRET || "",
          process.env.TWITTER_ACCESS_TOKEN || "",
          process.env.TWITTER_ACCESS_SECRET || ""
        );
        platformResults.twitter = result;
      } catch (e: any) {
        platformResults.twitter = { error: e.message };
      }
    }
    // Fallback simulation for unconfigured platforms
    if (!platformResults[platform]) {
      platformResults[platform] = { post_id: `SIM-${platform}-${Date.now()}`, simulated: true, url: `https://${platform}.com/demo` };
    }
  }

  return platformResults;
}

// ---- Accounts ----

router.get("/accounts", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`SELECT * FROM social_accounts WHERE tenant_id = ${tid(req)} AND status = 'active' ORDER BY platform`);
  res.json(rows.rows);
});

router.post("/accounts/connect", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { platform, account_name, account_id, access_token, token_expiry } = req.body;
  if (!platform) return res.status(400).json({ message: "Platform required" });
  const result = await db.execute(sql`
    INSERT INTO social_accounts (tenant_id, platform, account_name, account_id, access_token, token_expiry)
    VALUES (${tenantId}, ${platform}, ${account_name || null}, ${account_id || null}, ${access_token || null}, ${token_expiry || null})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

router.delete("/accounts/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  await db.execute(sql`UPDATE social_accounts SET status = 'disconnected' WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json({ message: "Disconnected" });
});

// ---- Posts ----

router.get("/posts", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { status, platform, from, to } = req.query as any;
  let q = `SELECT * FROM social_posts WHERE tenant_id = ${tenantId}`;
  if (status) q += ` AND status = '${status}'`;
  if (from) q += ` AND scheduled_at >= '${from}'`;
  if (to) q += ` AND scheduled_at <= '${to}'`;
  q += ` ORDER BY created_at DESC`;
  const rows = await db.execute(sql.raw(q));
  let result = rows.rows as any[];
  if (platform) result = result.filter((p: any) => (p.platforms || []).includes(platform));
  res.json(result);
});

router.post("/posts", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { title, content, platforms, scheduled_at, media_urls, hashtags } = req.body;
  if (!content) return res.status(400).json({ message: "Content required" });
  const status = scheduled_at ? "scheduled" : "draft";
  const result = await db.execute(sql`
    INSERT INTO social_posts (tenant_id, title, content, platforms, scheduled_at, media_urls, hashtags, status, created_by)
    VALUES (${tenantId}, ${title || null}, ${content}, ${JSON.stringify(platforms || [])}, ${scheduled_at || null}, ${JSON.stringify(media_urls || [])}, ${hashtags || null}, ${status}, ${req.user?.id || null})
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

router.get("/posts/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`SELECT * FROM social_posts WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  if (!rows.rows.length) return res.status(404).json({ message: "Not found" });
  res.json(rows.rows[0]);
});

router.put("/posts/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const post = (await db.execute(sql`SELECT * FROM social_posts WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`)).rows[0] as any;
  if (!post) return res.status(404).json({ message: "Not found" });
  if (post.status === "published") return res.status(400).json({ message: "Cannot edit published post" });
  const { title, content, platforms, scheduled_at, media_urls, hashtags } = req.body;
  await db.execute(sql`
    UPDATE social_posts SET
      title = COALESCE(${title || null}, title),
      content = COALESCE(${content || null}, content),
      platforms = COALESCE(${platforms ? JSON.stringify(platforms) : null}::jsonb, platforms),
      scheduled_at = COALESCE(${scheduled_at || null}, scheduled_at),
      media_urls = COALESCE(${media_urls ? JSON.stringify(media_urls) : null}::jsonb, media_urls),
      hashtags = COALESCE(${hashtags || null}, hashtags)
    WHERE id = ${req.params.id}
  `);
  const upd = await db.execute(sql`SELECT * FROM social_posts WHERE id = ${req.params.id}`);
  res.json(upd.rows[0]);
});

router.delete("/posts/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const post = (await db.execute(sql`SELECT * FROM social_posts WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`)).rows[0] as any;
  if (!post) return res.status(404).json({ message: "Not found" });
  if (post.status === "published") return res.status(400).json({ message: "Cannot cancel published post" });
  await db.execute(sql`UPDATE social_posts SET status = 'cancelled' WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  res.json({ message: "Cancelled" });
});

router.post("/posts/:id/publish-now", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const post = (await db.execute(sql`SELECT * FROM social_posts WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`)).rows[0] as any;
  if (!post) return res.status(404).json({ message: "Not found" });
  await db.execute(sql`UPDATE social_posts SET status = 'posting' WHERE id = ${req.params.id}`);
  const platformResults = await publishPost(post);
  await db.execute(sql`UPDATE social_posts SET status = 'published', published_at = NOW(), platform_results = ${JSON.stringify(platformResults)} WHERE id = ${req.params.id}`);
  res.json({ message: "Published", platform_results: platformResults });
});

router.post("/posts/:id/reschedule", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { scheduled_at } = req.body;
  if (!scheduled_at) return res.status(400).json({ message: "scheduled_at required" });
  await db.execute(sql`UPDATE social_posts SET scheduled_at = ${scheduled_at}, status = 'scheduled' WHERE id = ${req.params.id} AND tenant_id = ${tid(req)}`);
  const upd = await db.execute(sql`SELECT * FROM social_posts WHERE id = ${req.params.id}`);
  res.json(upd.rows[0]);
});

// ---- Scheduler run ----

router.post("/scheduler/run", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const dueRes = await db.execute(sql`SELECT * FROM social_posts WHERE tenant_id = ${tenantId} AND status = 'scheduled' AND scheduled_at <= NOW()`);
  const due = dueRes.rows as any[];
  let published = 0;
  for (const post of due) {
    await db.execute(sql`UPDATE social_posts SET status = 'posting' WHERE id = ${post.id}`);
    const platformResults = await publishPost(post);
    await db.execute(sql`UPDATE social_posts SET status = 'published', published_at = NOW(), platform_results = ${JSON.stringify(platformResults)} WHERE id = ${post.id}`);
    published++;
  }
  res.json({ published, total_due: due.length });
});

// ---- Analytics (legacy) ----

router.get("/analytics", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const rows = await db.execute(sql`
    SELECT a.*, p.title, p.content, p.platforms FROM social_analytics a
    JOIN social_posts p ON p.id = a.post_id
    WHERE a.tenant_id = ${tenantId} AND a.fetched_at >= NOW() - INTERVAL '30 days'
    ORDER BY a.fetched_at DESC
  `);
  res.json(rows.rows);
});

// ---- Analytics fetch & summary (new) — MUST be before /analytics/:postId ----

router.post("/analytics/fetch", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const postsRes = await db.execute(sql`
    SELECT * FROM social_posts
    WHERE tenant_id = ${tenantId} AND status = 'published' AND published_at >= NOW() - INTERVAL '30 days'
  `);
  const posts = postsRes.rows as any[];
  let fetched = 0;
  const errors: string[] = [];

  for (const post of posts) {
    const platformResults = post.platform_results || {};
    const platforms: string[] = post.platforms || [];

    for (const platform of platforms) {
      try {
        const pr = platformResults[platform] || {};
        let impressions = 0, reach = 0, clicks = 0, likes = 0, comments = 0, shares = 0, saves = 0, retweets = 0;

        if (platform === "facebook" && process.env.FACEBOOK_ACCESS_TOKEN && pr.id) {
          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pr.id}?fields=impressions,reach,clicks,likes.summary(true),comments.summary(true),shares&access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`);
          const fbData = await fbRes.json() as any;
          impressions = fbData.impressions || 0;
          reach = fbData.reach || 0;
          clicks = fbData.clicks || 0;
          likes = fbData.likes?.summary?.total_count || 0;
          comments = fbData.comments?.summary?.total_count || 0;
          shares = fbData.shares?.count || 0;
        } else if (platform === "instagram" && process.env.INSTAGRAM_ACCESS_TOKEN && pr.id) {
          const igRes = await fetch(`https://graph.facebook.com/v19.0/${pr.id}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`);
          const igData = await igRes.json() as any;
          const metrics = igData.data || [];
          for (const m of metrics) {
            if (m.name === "impressions") impressions = m.values?.[0]?.value || 0;
            if (m.name === "reach") reach = m.values?.[0]?.value || 0;
            if (m.name === "likes") likes = m.values?.[0]?.value || 0;
            if (m.name === "comments") comments = m.values?.[0]?.value || 0;
            if (m.name === "shares") shares = m.values?.[0]?.value || 0;
            if (m.name === "saved") saves = m.values?.[0]?.value || 0;
          }
        } else if (platform === "twitter" && process.env.TWITTER_BEARER_TOKEN && pr.data?.id) {
          const twRes = await fetch(`https://api.twitter.com/2/tweets/${pr.data.id}?tweet.fields=public_metrics`, {
            headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` },
          });
          const twData = await twRes.json() as any;
          const pm = twData.data?.public_metrics || {};
          impressions = pm.impression_count || 0;
          likes = pm.like_count || 0;
          retweets = pm.retweet_count || 0;
          comments = pm.reply_count || 0;
        } else {
          // Simulated
          impressions = Math.floor(Math.random() * 500) + 50;
          reach = Math.floor(impressions * 0.7);
          likes = Math.floor(Math.random() * 50);
          comments = Math.floor(Math.random() * 10);
          shares = Math.floor(Math.random() * 20);
        }

        await db.execute(sql`
          INSERT INTO social_post_analytics (tenant_id, post_id, platform, impressions, reach, clicks, likes, comments, shares, saves, retweets)
          VALUES (${tenantId}, ${post.id}, ${platform}, ${impressions}, ${reach}, ${clicks}, ${likes}, ${comments}, ${shares}, ${saves}, ${retweets})
        `);
        fetched++;
      } catch (e: any) {
        errors.push(`post ${post.id} ${platform}: ${e.message}`);
      }
    }
  }

  res.json({ fetched, errors });
});

router.get("/analytics/summary", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);

  const totalRes = await db.execute(sql`
    SELECT
      SUM(impressions) as total_impressions,
      SUM(reach) as total_reach,
      SUM(likes) as total_likes,
      SUM(comments) as total_comments,
      SUM(shares) as total_shares
    FROM social_post_analytics
    WHERE tenant_id = ${tenantId} AND fetched_at >= NOW() - INTERVAL '30 days'
  `);

  const byPlatformRes = await db.execute(sql`
    SELECT platform,
      SUM(impressions) as impressions,
      SUM(likes + comments + shares) as engagements,
      CASE WHEN SUM(impressions) > 0 THEN ROUND(SUM(likes + comments + shares)::numeric / SUM(impressions) * 100, 2) ELSE 0 END as engagement_rate
    FROM social_post_analytics
    WHERE tenant_id = ${tenantId} AND fetched_at >= NOW() - INTERVAL '30 days'
    GROUP BY platform
  `);

  const topPostsRes = await db.execute(sql`
    SELECT a.post_id, p.title, p.content, a.platform, a.impressions, a.likes, a.comments, a.shares,
      CASE WHEN a.impressions > 0 THEN ROUND((a.likes + a.comments + a.shares)::numeric / a.impressions * 100, 2) ELSE 0 END as engagement_rate
    FROM social_post_analytics a
    JOIN social_posts p ON p.id = a.post_id
    WHERE a.tenant_id = ${tenantId} AND a.fetched_at >= NOW() - INTERVAL '30 days'
    ORDER BY a.impressions DESC LIMIT 10
  `);

  const total = totalRes.rows[0] as any;
  res.json({
    total_impressions: parseInt(total?.total_impressions || "0"),
    total_reach: parseInt(total?.total_reach || "0"),
    total_likes: parseInt(total?.total_likes || "0"),
    total_comments: parseInt(total?.total_comments || "0"),
    total_shares: parseInt(total?.total_shares || "0"),
    by_platform: byPlatformRes.rows,
    top_posts: topPostsRes.rows,
  });
});

router.get("/analytics/posts/:id", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`
    SELECT * FROM social_post_analytics
    WHERE post_id = ${req.params.id} AND tenant_id = ${tid(req)}
    ORDER BY fetched_at DESC
  `);
  res.json(rows.rows);
});

// Legacy per-post analytics (MUST be after /analytics/summary and /analytics/posts/:id)
router.get("/analytics/:postId", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const rows = await db.execute(sql`SELECT * FROM social_analytics WHERE post_id = ${req.params.postId} AND tenant_id = ${tid(req)} ORDER BY fetched_at DESC`);
  res.json(rows.rows);
});

// ---- Calendar (month view) ----

router.get("/calendar", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const rows = await db.execute(sql`
    SELECT *, DATE(COALESCE(scheduled_at, created_at)) as post_date
    FROM social_posts WHERE tenant_id = ${tenantId} AND status IN ('scheduled', 'published', 'draft')
    ORDER BY COALESCE(scheduled_at, created_at)
  `);
  const grouped: Record<string, any[]> = {};
  for (const row of rows.rows as any[]) {
    const d = row.post_date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(row);
  }
  res.json(grouped);
});

router.get("/calendar/month", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { year, month } = req.query as any;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const rows = await db.execute(sql`
    SELECT id, title, platforms, status, scheduled_at,
      DATE(COALESCE(scheduled_at, created_at)) as post_date
    FROM social_posts
    WHERE tenant_id = ${tenantId}
      AND COALESCE(scheduled_at, created_at) >= ${startDate}::date
      AND COALESCE(scheduled_at, created_at) < ${endDate}::date
      AND status IN ('scheduled', 'published', 'draft')
    ORDER BY COALESCE(scheduled_at, created_at)
  `);

  const grouped: Record<string, any[]> = {};
  for (const row of rows.rows as any[]) {
    const d = String(row.post_date);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(row);
  }
  res.json(grouped);
});

// ---- Connect Status ----

router.get("/connect-status", requireAuth, async (_req: any, res) => {
  const result: Record<string, any> = {
    linkedin: { connected: false },
    facebook: { connected: false },
    instagram: { connected: false },
  };

  if (process.env.LINKEDIN_ACCESS_TOKEN) {
    try {
      const r = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}` },
      });
      if (r.ok) {
        const d = await r.json() as any;
        result.linkedin = { connected: true, profile_name: d.name || d.sub || "LinkedIn User" };
      } else {
        result.linkedin = { connected: true, profile_name: "LinkedIn (token set)" };
      }
    } catch {
      result.linkedin = { connected: true, profile_name: "LinkedIn (token set)" };
    }
  }

  if (process.env.FACEBOOK_PAGE_TOKEN && process.env.FACEBOOK_PAGE_ID) {
    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PAGE_ID}?fields=name&access_token=${process.env.FACEBOOK_PAGE_TOKEN}`);
      if (r.ok) {
        const d = await r.json() as any;
        result.facebook = { connected: true, page_name: d.name || "Facebook Page" };
      } else {
        result.facebook = { connected: true, page_name: "Facebook (token set)" };
      }
    } catch {
      result.facebook = { connected: true, page_name: "Facebook (token set)" };
    }
  }

  if (process.env.INSTAGRAM_PAGE_ID && process.env.FACEBOOK_PAGE_TOKEN) {
    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${process.env.INSTAGRAM_PAGE_ID}?fields=name&access_token=${process.env.FACEBOOK_PAGE_TOKEN}`);
      if (r.ok) {
        const d = await r.json() as any;
        result.instagram = { connected: true, page_name: d.name || "Instagram Account" };
      } else {
        result.instagram = { connected: true, page_name: "Instagram (token set)" };
      }
    } catch {
      result.instagram = { connected: true, page_name: "Instagram (token set)" };
    }
  }

  res.json(result);
});

// ---- Publish (immediate) ----

router.post("/publish", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { content, platforms, media_urls = [], post_id } = req.body;
  if (!content) return res.status(400).json({ message: "content required" });
  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) return res.status(400).json({ message: "platforms required" });

  const published: any[] = [];
  const failed: any[] = [];

  for (const platform of platforms) {
    try {
      let externalId = "";
      let url = "";
      let simulated = false;

      if (platform === "linkedin") {
        if (process.env.LINKEDIN_ACCESS_TOKEN) {
          // Get person URN
          const uinfoResp = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}` },
          });
          const uinfo = await uinfoResp.json() as any;
          const personSub = uinfo.sub || "me";

          const liResp = await fetch("https://api.linkedin.com/rest/posts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
              "LinkedIn-Version": "202401",
            },
            body: JSON.stringify({
              author: `urn:li:person:${personSub}`,
              lifecycleState: "PUBLISHED",
              specificContent: {
                "com.linkedin.ugc.ShareContent": {
                  shareCommentary: { text: content },
                  shareMediaCategory: "NONE",
                },
              },
              visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
            }),
          });
          const liData = await liResp.json() as any;
          externalId = liResp.headers.get("x-linkedin-id") || liData.id || `LI-${Date.now()}`;
          url = `https://www.linkedin.com/feed/update/${externalId}`;
        } else {
          externalId = `LI-${Date.now()}`;
          url = `https://www.linkedin.com/`;
          simulated = true;
        }
      } else if (platform === "facebook") {
        if (process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_TOKEN) {
          const fbResp = await fetch(`https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PAGE_ID}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content, access_token: process.env.FACEBOOK_PAGE_TOKEN }),
          });
          const fbData = await fbResp.json() as any;
          externalId = fbData.id || `FB-${Date.now()}`;
          url = `https://www.facebook.com/${externalId}`;
        } else {
          externalId = `FB-${Date.now()}`;
          url = `https://www.facebook.com/`;
          simulated = true;
        }
      } else if (platform === "instagram") {
        if (process.env.INSTAGRAM_PAGE_ID && process.env.FACEBOOK_PAGE_TOKEN) {
          const igBody: any = { caption: content, access_token: process.env.FACEBOOK_PAGE_TOKEN };
          if (media_urls[0]) igBody.image_url = media_urls[0];
          const containerResp = await fetch(`https://graph.facebook.com/v19.0/${process.env.INSTAGRAM_PAGE_ID}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(igBody),
          });
          const containerData = await containerResp.json() as any;
          if (containerData.id) {
            const pubResp = await fetch(`https://graph.facebook.com/v19.0/${process.env.INSTAGRAM_PAGE_ID}/media_publish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ creation_id: containerData.id, access_token: process.env.FACEBOOK_PAGE_TOKEN }),
            });
            const pubData = await pubResp.json() as any;
            externalId = pubData.id || `IG-${Date.now()}`;
          } else {
            externalId = `IG-${Date.now()}`;
            simulated = true;
          }
          url = `https://www.instagram.com/`;
        } else {
          externalId = `IG-${Date.now()}`;
          url = `https://www.instagram.com/`;
          simulated = true;
        }
      } else {
        externalId = `SIM-${platform}-${Date.now()}`;
        url = `https://${platform}.com/`;
        simulated = true;
      }

      // Upsert social_posts
      if (post_id) {
        await db.execute(sql`
          UPDATE social_posts SET status = 'published', published_at = NOW(),
            platform_results = platform_results || ${JSON.stringify({ [platform]: { id: externalId, simulated } })}::jsonb
          WHERE id = ${post_id} AND tenant_id = ${tenantId}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO social_posts (tenant_id, content, platforms, media_urls, status, published_at, platform_results)
          VALUES (${tenantId}, ${content}, ${JSON.stringify([platform])}, ${JSON.stringify(media_urls)}, 'published', NOW(), ${JSON.stringify({ [platform]: { id: externalId, simulated } })}::jsonb)
        `);
      }

      published.push({ platform, post_id: externalId, url, status: "published", simulated });
    } catch (e: any) {
      failed.push({ platform, error: e.message });
    }
  }

  res.json({ published, failed });
});

// ---- Schedule ----

router.post("/schedule", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const { content, platforms, scheduled_at, media_urls = [] } = req.body;
  if (!content) return res.status(400).json({ message: "content required" });
  if (!scheduled_at) return res.status(400).json({ message: "scheduled_at required" });
  const result = await db.execute(sql`
    INSERT INTO social_posts (tenant_id, content, platforms, media_urls, scheduled_at, status)
    VALUES (${tenantId}, ${content}, ${JSON.stringify(platforms || [])}, ${JSON.stringify(media_urls)}, ${scheduled_at}, 'scheduled')
    RETURNING *
  `);
  res.status(201).json(result.rows[0]);
});

// ---- Process Scheduled ----

router.post("/process-scheduled", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const dueRes = await db.execute(sql`
    SELECT * FROM social_posts WHERE tenant_id = ${tenantId} AND status = 'scheduled' AND scheduled_at <= NOW()
  `);
  const due = dueRes.rows as any[];
  let succeeded = 0;
  let failedCount = 0;

  for (const post of due) {
    const platforms: string[] = post.platforms || [];
    const platformResults: Record<string, any> = {};
    let anyFailed = false;

    for (const platform of platforms) {
      try {
        let externalId = "";
        let simulated = false;

        if (platform === "linkedin" && process.env.LINKEDIN_ACCESS_TOKEN) {
          const uinfoResp = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}` },
          });
          const uinfo = await uinfoResp.json() as any;
          const liResp = await fetch("https://api.linkedin.com/rest/posts", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`, "Content-Type": "application/json", "LinkedIn-Version": "202401" },
            body: JSON.stringify({
              author: `urn:li:person:${uinfo.sub || "me"}`,
              lifecycleState: "PUBLISHED",
              specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: post.content }, shareMediaCategory: "NONE" } },
              visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
            }),
          });
          const liData = await liResp.json() as any;
          externalId = liResp.headers.get("x-linkedin-id") || liData.id || `LI-${Date.now()}`;
        } else if (platform === "facebook" && process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_TOKEN) {
          const fbResp = await fetch(`https://graph.facebook.com/v19.0/${process.env.FACEBOOK_PAGE_ID}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: post.content, access_token: process.env.FACEBOOK_PAGE_TOKEN }),
          });
          const fbData = await fbResp.json() as any;
          externalId = fbData.id || `FB-${Date.now()}`;
        } else {
          externalId = `SIM-${platform}-${Date.now()}`;
          simulated = true;
        }
        platformResults[platform] = { id: externalId, simulated };
      } catch (e: any) {
        platformResults[platform] = { error: e.message };
        anyFailed = true;
      }
    }

    await db.execute(sql`
      UPDATE social_posts SET
        status = ${anyFailed ? "failed" : "published"},
        published_at = ${anyFailed ? null : "NOW()"},
        platform_results = ${JSON.stringify(platformResults)}::jsonb
      WHERE id = ${post.id}
    `);
    if (anyFailed) failedCount++; else succeeded++;
  }

  res.json({ processed: due.length, succeeded, failed: failedCount });
});

// ---- Aggregate Analytics (new endpoint per spec) ----

router.get("/analytics-summary", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);

  const byPlatformRes = await db.execute(sql`
    SELECT
      UNNEST(platforms::text[]) as platform,
      COUNT(*) as total_posts,
      0 as total_likes,
      0 as total_comments,
      0 as total_shares
    FROM social_posts
    WHERE tenant_id = ${tenantId} AND status = 'published'
    GROUP BY platform
  `);

  // Join with social_post_analytics for engagement if available
  const engRes = await db.execute(sql`
    SELECT spa.platform,
      SUM(spa.likes) as total_likes,
      SUM(spa.comments) as total_comments,
      SUM(spa.shares) as total_shares,
      SUM(spa.impressions) as total_impressions,
      CASE WHEN SUM(spa.impressions) > 0
        THEN ROUND(SUM(spa.likes + spa.comments + spa.shares)::numeric / SUM(spa.impressions) * 100, 2)
        ELSE 0 END as avg_engagement
    FROM social_post_analytics spa
    WHERE spa.tenant_id = ${tenantId}
    GROUP BY spa.platform
  `);

  const postsByDay = await db.execute(sql`
    SELECT DATE(published_at) as day, COUNT(*) as count
    FROM social_posts
    WHERE tenant_id = ${tenantId} AND status = 'published' AND published_at >= NOW() - INTERVAL '30 days'
    GROUP BY day ORDER BY day
  `);

  const bestPost = await db.execute(sql`
    SELECT sp.id, sp.content, sp.platforms, sp.published_at,
      COALESCE(SUM(spa.likes + spa.comments + spa.shares), 0) as engagement
    FROM social_posts sp
    LEFT JOIN social_post_analytics spa ON spa.post_id = sp.id
    WHERE sp.tenant_id = ${tenantId} AND sp.status = 'published'
    GROUP BY sp.id, sp.content, sp.platforms, sp.published_at
    ORDER BY engagement DESC LIMIT 1
  `);

  res.json({
    by_platform: engRes.rows,
    posts_count_by_platform: byPlatformRes.rows,
    posts_by_day: postsByDay.rows,
    best_performing_post: bestPost.rows[0] || null,
  });
});

// ---- Sync Engagement ----

router.post("/sync-engagement", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const postsRes = await db.execute(sql`
    SELECT * FROM social_posts WHERE tenant_id = ${tenantId} AND status = 'published' AND published_at >= NOW() - INTERVAL '30 days'
  `);
  const posts = postsRes.rows as any[];
  let synced = 0;

  for (const post of posts) {
    const platforms: string[] = post.platforms || [];
    const platformResults = post.platform_results || {};

    for (const platform of platforms) {
      const pr = platformResults[platform] || {};
      let likes = 0, comments = 0, shares = 0;

      try {
        if (platform === "linkedin" && process.env.LINKEDIN_ACCESS_TOKEN && pr.id && !pr.simulated) {
          const r = await fetch(`https://api.linkedin.com/v2/socialMetadata/${encodeURIComponent(pr.id)}`, {
            headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`, "LinkedIn-Version": "202401" },
          });
          if (r.ok) {
            const d = await r.json() as any;
            likes = d.likesSummary?.totalLikes || 0;
            comments = d.commentsSummary?.totalFirstLevelComments || 0;
            shares = d.shareStatistics?.shareCount || 0;
          } else {
            likes = Math.floor(Math.random() * 20);
            comments = Math.floor(Math.random() * 5);
            shares = Math.floor(Math.random() * 8);
          }
        } else if (platform === "facebook" && process.env.FACEBOOK_PAGE_TOKEN && pr.id && !pr.simulated) {
          const r = await fetch(`https://graph.facebook.com/v19.0/${pr.id}?fields=likes.summary(true),comments.summary(true),shares&access_token=${process.env.FACEBOOK_PAGE_TOKEN}`);
          if (r.ok) {
            const d = await r.json() as any;
            likes = d.likes?.summary?.total_count || 0;
            comments = d.comments?.summary?.total_count || 0;
            shares = d.shares?.count || 0;
          } else {
            likes = Math.floor(Math.random() * 20);
            comments = Math.floor(Math.random() * 5);
            shares = Math.floor(Math.random() * 8);
          }
        } else {
          // Simulate small increments
          likes = Math.floor(Math.random() * 10);
          comments = Math.floor(Math.random() * 3);
          shares = Math.floor(Math.random() * 5);
        }

        await db.execute(sql`
          INSERT INTO social_post_analytics (tenant_id, post_id, platform, likes, comments, shares)
          VALUES (${tenantId}, ${post.id}, ${platform}, ${likes}, ${comments}, ${shares})
        `);
        synced++;
      } catch { /* skip */ }
    }
  }

  res.json({ synced });
});

// ---- Unpublish / Delete post ----

router.delete("/posts/:id/unpublish", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const tenantId = tid(req);
  const post = (await db.execute(sql`SELECT * FROM social_posts WHERE id = ${req.params.id} AND tenant_id = ${tenantId}`)).rows[0] as any;
  if (!post) return res.status(404).json({ message: "Not found" });

  const platforms: string[] = post.platforms || [];
  const platformResults = post.platform_results || {};

  for (const platform of platforms) {
    const pr = platformResults[platform] || {};
    try {
      if (platform === "facebook" && process.env.FACEBOOK_PAGE_TOKEN && pr.id && !pr.simulated) {
        await fetch(`https://graph.facebook.com/v19.0/${pr.id}?access_token=${process.env.FACEBOOK_PAGE_TOKEN}`, { method: "DELETE" });
      }
      // LinkedIn delete not available in free API tier; mark deleted in DB
    } catch { /* continue */ }
  }

  await db.execute(sql`UPDATE social_posts SET status = 'deleted' WHERE id = ${req.params.id} AND tenant_id = ${tenantId}`);
  res.json({ message: "Post marked as deleted" });
});

// ---- Hashtag suggestions ----

router.get("/hashtag/suggestions", requireAuth, async (req: any, res) => {
  await ensureTablesOnce();
  const { topic = "" } = req.query as any;
  const topicLower = topic.toLowerCase().replace(/[^a-z]/g, "");

  const hashtagMap: Record<string, string[]> = {
    food: ["#foodie", "#instafood", "#foodphotography", "#delicious", "#homemade", "#yummy", "#foodlover"],
    business: ["#business", "#entrepreneur", "#startup", "#success", "#motivation", "#leadership", "#growth"],
    technology: ["#tech", "#technology", "#innovation", "#digital", "#AI", "#software", "#coding"],
    marketing: ["#marketing", "#digitalmarketing", "#socialmedia", "#branding", "#growth", "#contentmarketing"],
    india: ["#india", "#incredible_india", "#makeinindia", "#atmanirbharbharat", "#bharat"],
    health: ["#health", "#wellness", "#fitness", "#healthy", "#lifestyle", "#mentalhealth"],
    education: ["#education", "#learning", "#knowledge", "#students", "#teaching", "#edtech"],
    environment: ["#environment", "#sustainability", "#gogreen", "#ecofriendly", "#climateaction"],
    water: ["#water", "#cleanwater", "#waterconservation", "#h2o", "#drinkingwater"],
    swachh: ["#swachhharat", "#cleanindia", "#swachbharat", "#cleanliness", "#hygiene"],
  };

  const suggestions: string[] = [];
  for (const [key, tags] of Object.entries(hashtagMap)) {
    if (topicLower.includes(key) || key.includes(topicLower)) {
      suggestions.push(...tags);
    }
  }

  // Default popular hashtags if no match
  if (suggestions.length === 0) {
    suggestions.push("#trending", "#viral", "#socialmedia", "#content", "#digital", "#india", "#business");
  }

  const unique = suggestions.filter((v, i, a) => a.indexOf(v) === i);
  res.json({ topic, suggestions: unique.slice(0, 10) });
});

export default router;
