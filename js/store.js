/**
 * Store handles all interaction with localStorage.
 * This centralizes data persistence, making it easier to debug or migrate to a database.
 */
export const Store = {
    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },
    get(key, defaultValue = null) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};
