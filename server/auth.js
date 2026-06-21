const { COMMUNITY_KEY } = require("./config");
const { sendJson } = require("./http");

function requireCommunityKey(req, res, url) {
  if (!COMMUNITY_KEY) return true;
  const provided = req.headers["x-community-key"];
  const queryKey = url ? url.searchParams.get("key") : "";
  if (provided === COMMUNITY_KEY || queryKey === COMMUNITY_KEY) return true;
  sendJson(res, 401, { error: "コミュニティの合言葉が必要です" });
  return false;
}

module.exports = {
  requireCommunityKey
};
