export default {
    unique<T>(array: Array<T>, getCompareValue: (object: T) => any): Array<T> {
        const seen: Array<any> = [];
        return array.filter((i) => {
            const value = getCompareValue(i);
            if (seen.includes(value)) return false;
            seen.push(value);
            return true;
        });
    },
};
