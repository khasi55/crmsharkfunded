// Simulate backend logic for filtering and pagination
const payments = Array.from({ length: 105 }, (_, i) => ({
    id: `pay_${i}`,
    status: i % 3 === 0 ? 'paid' : i % 3 === 1 ? 'pending' : 'failed',
    amount: (i + 1) * 10
}));

const testPagination = (page, limit, status) => {
    let filtered = payments;
    if (status && status !== 'all') {
        filtered = filtered.filter(p => p.status === status);
    }
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);
    return {
        dataLength: paginated.length,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        firstItem: paginated[0],
        lastItem: paginated[paginated.length - 1]
    };
};

console.log("--- TEST RESULTS ---");
console.log("All, Page 1:", testPagination(1, 50, 'all'));
console.log("All, Page 2:", testPagination(2, 50, 'all'));
console.log("Paid, Page 1:", testPagination(1, 50, 'paid'));
console.log("Pending, Page 1:", testPagination(1, 50, 'pending'));
