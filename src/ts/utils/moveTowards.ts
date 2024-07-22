export function moveTowards(current: number, target: number, rate: number) {
    if(target > current) {
        return Math.min(target, current + rate);
    } else {
        return Math.max(target, current - rate);
    }
}