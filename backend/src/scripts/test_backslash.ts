
const g = 'DEMO\\S\\0-SF';
console.log('Group string:', g);
console.log('Searching for literal "\\S\\":', g.includes('\\S\\'));
console.log('Searching for literal "\\SF\\":', g.includes('\\SF\\'));

const g2 = 'DEMO\\SF\\2-PRO';
console.log('\nGroup string:', g2);
console.log('Searching for literal "\\S\\":', g2.includes('\\S\\'));
console.log('Searching for literal "\\SF\\":', g2.includes('\\SF\\'));
