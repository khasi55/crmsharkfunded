import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = `
900909609618	"Kutteddula kasi Viswanath reddy"			demo\\S\\ImAccount		0	4841.44		4841.44	0.00	USD
900909609619	"Chetan Chouhan"			demo\\S\\ImAccount		0	5707.23		5707.23	0.00	USD
900909609620	"Nithyapoojesh "			demo\\S\\ImAccount		0	4828.83		4828.83	0.00	USD
900909609621	"Rohit Tupe "			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609622	"RAHUL SONAWANE"			demo\\S\\ImAccount		0	5171.51		5171.51	0.00	USD
900909609623	"Ronak pandurang shedage"			demo\\S\\ImAccount		0	4961.91		4961.91	0.00	USD
900909609624	"nikhil"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609625	"Balram Sahu"			demo\\S\\ImAccount		0	4983.13		4983.13	0.00	USD
900909609626	"Viswanath"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609627	"Viswanath"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609628	"shubh bhardwaj"			demo\\S\\ImAccount		0	5050.73		5050.73	0.00	USD
900909609629	"Khushi kasana"			demo\\S\\ImAccount		0	4832.62		4832.62	0.00	USD
900909609630	"K Kishan Pawar"			demo\\S\\ImAccount		0	10199.88		10199.88	0.00	USD
900909609631	"Shaik Abdul Kareem Anas"			demo\\S\\ImAccount		0	4795.90		4795.90	0.00	USD
900909609632	"Mohd Parvez"			demo\\S\\ImAccount		0	5302.55		5302.55	0.00	USD
900909609633	"Sonu Kumar "			demo\\S\\ImAccount		0	5044.88		5044.88	0.00	USD
900909609634	"KULESHWAR PRASAD"			demo\\S\\ImAccount		0	10399.09		10399.09	0.00	USD
900909609635	"Arsh Beg"			demo\\S\\ImAccount		0	4863.03		4863.03	0.00	USD
900909609636	"Ayush Khatri "			demo\\S\\ImAccount		0	10002.49		10002.49	0.00	USD
900909506842	"Karanjeet Singh"			demo\\S\\ImAccount		0	5030.17		5030.17	0.00	USD
900909609638	"Riyaz B"			demo\\S\\ImAccount		0	10066.94		10066.94	0.00	USD
900909609639	"Manish Manish"			demo\\S\\ImAccount		0	4844.48		4844.48	0.00	USD
900909609640	"Gagan gupta"			demo\\S\\ImAccount		0	4747.15		4747.15	0.00	USD
900909609641	"Aakash "			demo\\S\\ImAccount		0	9519.95		9519.95	0.00	USD
900909609642	"Anshuman Soni"			demo\\S\\ImAccount		0	9217.01		9217.01	0.00	USD
900909609643	"Heet Patel"			demo\\S\\ImAccount		0	4874.63		4874.63	0.00	USD
900909609644	"Shaik Abdul Kareem Anas"			demo\\S\\ImAccount		0	4764.43		4764.43	0.00	USD
900909609645	"Rohan Ghadge"			demo\\S\\ImAccount		0	5300.30		5300.30	0.00	USD
900909609646	"Aqsam"			demo\\S\\ImAccount		0	10990.56		10990.56	0.00	USD
900909609647	"KOUSHIK ADHIKARI"			demo\\S\\ImAccount		0	5022.35		5022.35	0.00	USD
900909609648	"Vihang Morje"			demo\\S\\ImAccount		0	5133.44		5133.44	0.00	USD
900909609649	"Gurinder Kumar"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609650	"Manoj Tomar"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609651	"Raghav makkar"			demo\\S\\ImAccount		0	4992.67		4992.67	0.00	USD
900909609652	"Nilesh Dhopare"			demo\\S\\ImAccount		0	4887.20		4887.20	0.00	USD
900909609653	"Nilesh Dhopare"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609654	"Himanshu khatwani "			demo\\S\\ImAccount		0	9688.87		9688.87	0.00	USD
900909609655	"d3devansh12"			demo\\S\\ImAccount		0	4999.42		4999.42	0.00	USD
900909609656	"Bipin Kumbhar"			demo\\S\\ImAccount		0	4848.67		4848.67	0.00	USD
900909609657	"Ashok Kumar "			demo\\S\\ImAccount		0	2907.76		2907.76	0.00	USD
900909609658	"Gurinder Kumar"			demo\\S\\ImAccount		0	4902.65		4902.65	0.00	USD
900909609659	"Roushan Kumar"			demo\\S\\ImAccount		0	4797.85		4797.85	0.00	USD
900909609660	"Sultan mohammed "			demo\\S\\ImAccount		0	2896.84		2896.84	0.00	USD
900909609661	"Aqsam"			demo\\S\\ImAccount		0	11410.66		11410.66	0.00	USD
900909609662	"Suraj Shaikh"			demo\\S\\ImAccount		0	9559.45		9559.45	0.00	USD
900909609663	"Sultan mohammed "			demo\\S\\ImAccount		0	2481.69		2481.69	0.00	USD
900909609664	"harshfx"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609665	"Ashutosh Hendwe"			demo\\S\\ImAccount		0	9396.10		9396.10	0.00	USD
900909609666	"tajinderpal singh roopra"			demo\\S\\ImAccount		0	9786.69		9786.69	0.00	USD
900909609667	"Vikrant Oraon"			demo\\S\\ImAccount		0	4940.84		4940.84	0.00	USD
900909609668	"Rahul Singh"			demo\\S\\ImAccount		0	5311.53		5311.53	0.00	USD
900909609669	"Safvan Imran Patel "			demo\\S\\ImAccount		0	4782.50		4782.50	0.00	USD
900909609670	"Aditya kiran Lal"			demo\\S\\ImAccount		0	3000.71		3000.71	0.00	USD
900909609671	"SUBIN NP"			demo\\S\\ImAccount		0	4985.30		4985.30	0.00	USD
900909609672	"Santosh Kumar Mahanta"			demo\\S\\ImAccount		0	10711.00		10711.00	0.00	USD
900909609673	"Roushan Kumar"			demo\\S\\ImAccount		0	5081.95		5081.95	0.00	USD
900909609674	"Vanshika"			demo\\S\\ImAccount		0	10271.74		10271.74	0.00	USD
900909609675	"sujal vijay"			demo\\S\\ImAccount		0	4843.26		4843.26	0.00	USD
900909609676	"Pranav gorakhnath kalel"			demo\\S\\ImAccount		0	4832.64		4832.64	0.00	USD
900909609677	"Algi Luthwika Mulki"			demo\\S\\ImAccount		0	9949.40		9949.40	0.00	USD
900909609678	"Pavan Motwani"			demo\\S\\ImAccount		0	5761.09		5761.09	0.00	USD
900909609679	"Heet Kajavadra"			demo\\S\\ImAccount		0	4733.27		4733.27	0.00	USD
900909609680	"Heet Kajavadra"			demo\\S\\ImAccount		0	9727.96		9727.96	0.00	USD
900909609681	"Krushna Baravkar "			demo\\S\\ImAccount		0	5016.71		5016.71	0.00	USD
900909609682	"Praveen Kumar"			demo\\S\\ImAccount		0	10344.70		10344.70	0.00	USD
900909609683	"Neeraj Malbhage"			demo\\S\\ImAccount		0	4856.60		4856.60	0.00	USD
900909609684	"PRASHANT KUMAR"			demo\\S\\ImAccount		0	9595.50		9595.50	0.00	USD
900909609685	"Yogesh Dixit"			demo\\S\\ImAccount		0	24925.80		24925.80	0.00	USD
900909609686	"Giriraj SINGH Panwar"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609687	"Pravin Khandekar"			demo\\S\\ImAccount		0	4845.76		4845.76	0.00	USD
900909609688	"Suraj Verma "			demo\\S\\ImAccount		0	4985.85		4985.85	0.00	USD
900909609689	"Pravin Khandekar"			demo\\S\\ImAccount		0	5229.77		5229.77	0.00	USD
900909609690	"Nilesh Sonwane"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609691	"beepin Kumar"			demo\\S\\ImAccount		0	5068.09		5068.09	0.00	USD
900909609692	"Nilesh Sonwane"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609693	"Amrit Pritam Sahoo"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609694	"Suraj dewle"			demo\\S\\ImAccount		0	5013.94		5013.94	0.00	USD
900909609695	"Bipin Kumbhar"			demo\\S\\ImAccount		0	4849.78		4849.78	0.00	USD
900909609696	"PRASHANT KUMAR"			demo\\S\\ImAccount		0	10205.70		10205.70	0.00	USD
900909609697	"Jay Patel"			demo\\S\\ImAccount		0	4789.17		4789.17	0.00	USD
900909609698	"Anshuman kalta"			demo\\S\\ImAccount		0	4847.00		4847.00	0.00	USD
900909609699	"Mitesh"			demo\\S\\ImAccount		0	5040.36		5040.36	0.00	USD
900909609700	"prathmesh khambalkar"			demo\\S\\ImAccount		0	2927.05		2927.05	0.00	USD
900909609701	"PRASHANT KUMAR"			demo\\S\\ImAccount		0	10464.62		10464.62	0.00	USD
900909609702	"ABHISHEK SINGH"			demo\\S\\ImAccount		0	9586.85		9586.85	0.00	USD
900909609703	"Akshay Sawant"			demo\\S\\ImAccount		0	10000.00		10000.00	0.00	USD
900909609704	"Akshay Sawant"			demo\\S\\ImAccount		0	10035.28		10035.28	0.00	USD
900909609705	"Lokesh J s"			demo\\S\\ImAccount		0	5043.90		5043.90	0.00	USD
900909609706	"Shaik Abdul Kareem Anas"			demo\\S\\ImAccount		0	4795.55		4795.55	0.00	USD
900909609707	"Venkat Mohan Krishna V"			demo\\S\\ImAccount		0	10947.50		10947.50	0.00	USD
900909609708	"Rohan Achaniya "			demo\\S\\ImAccount		0	12338.95		12338.95	0.00	USD
900909609709	"Duddu Vilson babu"			demo\\S\\ImAccount		0	4845.90		4845.90	0.00	USD
900909609710	"anam sharma"			demo\\S\\ImAccount		0	24992.52		24992.52	0.00	USD
900909609711	"N/A"			demo\\S\\ImAccount		0	10014.05		10014.05	0.00	USD
900909609712	"HITESH"			demo\\S\\ImAccount		0	9477.60		9477.60	0.00	USD
900909609713	"SACHIN PARMAR "			demo\\S\\ImAccount		0	5103.30		5103.30	0.00	USD
900909609714	"Pranav gorakhnath kalel"			demo\\S\\ImAccount		0	9705.40		9705.40	0.00	USD
900909609715	"BIBHISHAN BALAJI LOKHANDE "			demo\\S\\ImAccount		0	25005.83		25005.83	0.00	USD
900909609716	"Gulashan sahu"			demo\\S\\ImAccount		0	4985.35		4985.35	0.00	USD
900909609717	"Raghawendra Chaurasiya"			demo\\S\\ImAccount		0	10000.00		10000.00	0.00	USD
900909609718	"Ayesha Ali"			demo\\S\\ImAccount		0	9930.00		9930.00	0.00	USD
900909609719	"Siddharth Dalbanjan"			demo\\S\\ImAccount		0	5009.79		5009.79	0.00	USD
900909609720	"mohd Arsh"			demo\\S\\ImAccount		0	5000.01		5000.01	0.00	USD
900909609721	"Subham Kumar"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609722	"Bobby Paswan"			demo\\S\\ImAccount		0	4904.45		4904.45	0.00	USD
900909609723	"ABHISHEK SINGH"			demo\\S\\ImAccount		0	9593.04		9593.04	0.00	USD
900909609724	"Aasim Makhamalla"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609725	"Vansh Movalia"			demo\\S\\ImAccount		0	5812.95		5812.95	0.00	USD
900909609726	"MOHITHA PIPAL"			demo\\S\\ImAccount		0	4889.95		4889.95	0.00	USD
900909609727	"Vedant Hemane"			demo\\S\\ImAccount		0	4848.60		4848.60	0.00	USD
900909609728	"Jony Molla"			demo\\S\\ImAccount		0	48378.50		48378.50	0.00	USD
900909609729	"SEELAM ILLARAM NARAYANA REDDY"			demo\\S\\ImAccount		0	25344.10		25344.10	0.00	USD
900909609730	"ABHISHEK SINGH"			demo\\S\\ImAccount		0	9583.25		9583.25	0.00	USD
900909609731	"SUMESH U S"			demo\\S\\ImAccount		0	3012.83		3012.83	0.00	USD
900909609732	"Gulshan Kowe"			demo\\S\\ImAccount		0	9614.40		9614.40	0.00	USD
900909609733	"Gulashan sahu"			demo\\S\\ImAccount		0	5142.62		5142.62	0.00	USD
900909609734	"Sougata Pal"			demo\\S\\ImAccount		0	5015.91		5015.91	0.00	USD
900909609735	"vijender"			demo\\S\\ImAccount		0	3000.00		3000.00	0.00	USD
900909609736	"ABHISHEK SINGH"			demo\\S\\ImAccount		0	9637.49		9637.49	0.00	USD
900909609737	"Deepanshu Sharma"			demo\\S\\ImAccount		0	10011.57		10011.57	0.00	USD
900909609738	"VANLALPEKHLUA"			demo\\S\\ImAccount		0	5023.85		5023.85	0.00	USD
900909609739	"Sonu Saini"			demo\\S\\ImAccount		0	9644.24		9644.24	0.00	USD
900909609740	"Shaik Abdul Kareem Anas"			demo\\S\\ImAccount		0	0.00		0.00	0.00	USD
900909609745	"Ganesh shankar yadav"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609746	"MANOJKUMAR KANTILAL RANA"			demo\\S\\ImAccount		0	4999.38		4999.38	0.00	USD
900909609747	"Parvez N"			demo\\S\\ImAccount		0	4847.56		4847.56	0.00	USD
900909609748	"Sushil "			demo\\S\\ImAccount		0	2774.25		2774.25	0.00	USD
900909609749	"Rajesh ray "			demo\\S\\ImAccount		0	4848.01		4848.01	0.00	USD
900909609750	"KANTEPALLI SANKARAMMA"			demo\\S\\ImAccount		0	10000.00		10000.00	0.00	USD
900909609751	"Aditya Rathod"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609752	"Tanishak Sabharwal"			demo\\S\\ImAccount		0	5000.00		5000.00	0.00	USD
900909609753	"Steve"			demo\\S\\ImAccount		0	5150.84		5150.84	0.00	USD
900909609754	"Om Gaikwad"			demo\\S\\ImAccount		0	5045.52		5045.52	0.00	USD
900909609755	"Nikhil Ks"			demo\\S\\ImAccount		0	4951.34		4951.34	0.00	USD
900909609756	"Yogesh Ramchandra Sawant"			demo\\S\\ImAccount		0	9808.30		9808.30	0.00	USD
900909609757	"Raju Singh"			demo\\S\\ImAccount		0	5000.30		5000.30	0.00	USD
900909609758	"Vsv Sujal"			demo\\S\\ImAccount		0	4874.12		4874.12	0.00	USD
900909609759	"Sunit"			demo\\S\\ImAccount		0	9846.64		9846.64	0.00	USD
900909609760	"Mayank Khachariya"			demo\\S\\ImAccount		0	4997.98		4997.98	0.00	USD
900909609761	"Sajid ali"			demo\\S\\ImAccount		0	4999.64		4999.64	0.00	USD
900909609762	"Salim Shaikh"			demo\\S\\ImAccount		0	10094.90		10094.90	0.00	USD
`;

async function verify() {
    const lines = rawData.trim().split('\n');
    const accounts = lines.map(line => {
        const parts = line.split('\t');
        const login = parts[0].trim();
        const name = parts[1].replace(/"/g, '').trim();
        const providedGroup = parts[4] ? parts[4].trim() : (parts[3] ? parts[3].trim() : 'N/A');
        return { login: parseInt(login), name, providedGroup };
    });

    const results = [];

    for (const acc of accounts) {
        const { data, error } = await supabase
            .from('challenges')
            .select('group')
            .eq('login', acc.login)
            .maybeSingle();

        if (error) {
            console.error(`Error fetching account ${acc.login}:`, error.message);
            continue;
        }

        const dbGroup = data?.group || 'NOT FOUND';
        const isMatch = dbGroup === acc.providedGroup;

        results.push({
            Login: acc.login.toString(), // Force string to prevent scientific notation
            Name: acc.name,
            'Provided Group': acc.providedGroup,
            'Database Group': dbGroup,
            'Match?': isMatch ? 'YES' : 'NO'
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Verification Results');

    // Set column widths
    worksheet['!cols'] = [
        { wch: 20 }, // Login (increased for clarity)
        { wch: 35 }, // Name
        { wch: 30 }, // Provided Group
        { wch: 30 }, // Database Group
        { wch: 10 }  // Match?
    ];

    // Additional step to ensure Login column cells are treated as strings
    const range = XLSX.utils.decode_range(worksheet['!ref']!);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: 0 }); // Column A (0)
        const cell = worksheet[cellAddress];
        if (cell) {
            cell.t = 's'; // Force type to string
        }
    }

    XLSX.writeFile(workbook, 'verification_results.xlsx');
    console.log('Results exported to verification_results.xlsx with fixed formatting');
}

verify().catch(console.error);
