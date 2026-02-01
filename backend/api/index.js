// Simple test to verify Vercel is working
module.exports = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Hello from Vercel!',
        path: req.url,
        method: req.method
    });
};
