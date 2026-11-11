const searchService = require('../services/searchService');

/**
 * @desc    Global Multi-Entity Search (Products and Developer Accounts)
 * @route   GET /api/search?q=...&type=all|products|developers&limit=10
 * @access  Public
 */
const searchGlobal = async (req, res) => {
  try {
    const rawQuery = (req.query.q || '').trim();
    const type = (req.query.type || 'all').toLowerCase();
    const limit = parseInt(req.query.limit, 10) || 10;

    // Validate type parameter
    const validTypes = ['all', 'products', 'developers'];
    const resolvedType = validTypes.includes(type) ? type : 'all';

    // Fast return if query is too short
    if (!rawQuery || rawQuery.length < 2) {
      return res.json({
        success: true,
        query: rawQuery,
        totalMatches: 0,
        results: {
          products: [],
          developers: [],
        },
      });
    }

    // Limit maximum query length to prevent regex/memory abuse
    if (rawQuery.length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Search query is too long. Please restrict query to 80 characters.',
      });
    }

    const payload = await searchService.search(rawQuery, {
      type: resolvedType,
      limit,
    });

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=60, stale-while-revalidate=120');
    res.json(payload);
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while executing search.',
    });
  }
};

module.exports = {
  searchGlobal,
};

