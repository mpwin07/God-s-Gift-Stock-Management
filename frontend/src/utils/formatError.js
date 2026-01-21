/**
 * Formats API error messages for display.
 * Handles both string errors and Pydantic validation error arrays.
 * 
 * @param {string|Array|Object} detail - The error detail from API response
 * @returns {string} - Formatted error message string
 */
export const formatErrorMessage = (detail) => {
    if (!detail) {
        return 'An error occurred';
    }

    // If it's a simple string, return it directly
    if (typeof detail === 'string') {
        return detail;
    }

    // If it's an array (Pydantic validation errors like [{type, loc, msg, input}])
    if (Array.isArray(detail)) {
        // Extract the 'msg' field from each error object and join them
        const messages = detail
            .map(err => {
                if (typeof err === 'string') return err;
                if (err && typeof err === 'object' && err.msg) {
                    // Include field location for context if available
                    const field = err.loc?.slice(-1)[0];
                    return field ? `${field}: ${err.msg}` : err.msg;
                }
                return null;
            })
            .filter(Boolean);

        return messages.length > 0 ? messages.join(', ') : 'Validation error';
    }

    // If it's an object with a message property
    if (typeof detail === 'object') {
        if (detail.msg) return detail.msg;
        if (detail.message) return detail.message;
        // Last resort: stringify it
        try {
            return JSON.stringify(detail);
        } catch {
            return 'An error occurred';
        }
    }

    return 'An error occurred';
};

export default formatErrorMessage;
