export const sanitizeMongo = (req, _, next) => {
    const sanitize = (obj) => {
        Object.keys(obj).forEach(key => {
            if (key.includes('$') || key.includes('.')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        });
    };

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);

    next();
};