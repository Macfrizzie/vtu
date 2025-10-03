
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database } from 'lucide-react';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { app } from '@/lib/firebase/client-app';
import type { DataPlan } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

const db = getFirestore(app);

const dataPlansText = `
13 9MOBILE GIFTING ₦4050.0 15.0 GB ---30 days
14 9MOBILE GIFTING ₦3240.0 11.0 GB --- 30 days
15 9MOBILE GIFTING ₦1620.0 4.5 GB ---30 days
33 9MOBILE GIFTING ₦972.0 2.0 GB --- 30 days
36 9MOBILE GIFTING ₦810.0 1.5 GB ---30 days
58 9MOBILE GIFTING ₦12150.0 75.0 GB --- 30 days
117 9MOBILE GIFTING ₦44.0 25.0 MB --- 1 day
118 9MOBILE "CORPORATE GIFTING" ₦3600.0 10.0 GB --- 30 days
119 9MOBILE GIFTING ₦168.0 650.0 MB --- 1 day
120 9MOBILE GIFTING ₦243.0 1.0 GB --- 1 day
121 9MOBILE GIFTING ₦410.0 2000.0 MB --- 1 day
122 9MOBILE GIFTING ₦168.0 250.0 MB --- 7 days
123 9MOBILE GIFTING ₦410.0 500.0 MB --- 30 days
142 9MOBILE GIFTING ₦8100.0 40.0 GB --- 30 days
241 9MOBILE SME ₦300.0 1.0 GB --- 30 days
242 9MOBILE SME ₦600.0 2.0 GB --- 30 days
243 9MOBILE SME ₦450.0 1.5 GB --- 30 days
244 9MOBILE SME ₦900.0 3.0 GB --- 30 days
245 9MOBILE SME ₦1200.0 4.0 GB --- 30 days
246 9MOBILE SME ₦1350.0 4.5 GB --- 30 days
247 9MOBILE SME ₦1050.0 3.5 GB --- 30 days
248 9MOBILE SME ₦1500.0 5.0 GB --- 30 days
249 9MOBILE SME ₦3000.0 10.0 GB --- 30 days
256 9MOBILE SME ₦9100.0 40.0 GB --- 30 days
272 9MOBILE "CORPORATE GIFTING" ₦360.0 1.0 GB --- 30 days
464 9MOBILE "CORPORATE GIFTING" ₦540.0 1.5 GB --- 30 days
274 9MOBILE "CORPORATE GIFTING" ₦720.0 2.0 GB --- 30 days
275 9MOBILE "CORPORATE GIFTING" ₦185.0 500.0 MB --- 30 days
463 9MOBILE "CORPORATE GIFTING" ₦1440.0 4.0 GB --- 30 days
277 9MOBILE "CORPORATE GIFTING" ₦1080.0 3.0 GB --- 30 days
278 9MOBILE "CORPORATE GIFTING" ₦1620.0 4.5 GB --- 30 days
280 9MOBILE "CORPORATE GIFTING" ₦3960.0 11.0 GB --- 30 days
281 9MOBILE "CORPORATE GIFTING" ₦5400.0 15.0 GB ...30days
282 9MOBILE "CORPORATE GIFTING" ₦7200.0 20.0 GB ...30days
283 9MOBILE "CORPORATE GIFTING" ₦10800.0 30.0 GB ...30days
284 9MOBILE "CORPORATE GIFTING" ₦9000.0 25.0 GB ...30days
286 9MOBILE "CORPORATE GIFTING" ₦2700.0 7.5 GB --- 30 days
295 9MOBILE "CORPORATE GIFTING" ₦1800.0 5.0 GB --- 30 days
465 9MOBILE "CORPORATE GIFTING" ₦14400.0 40.0 GB --- 30 days
437 AIRTEL "AWOOF GIFTING" ₦14840.0 60.0 GB ----30days
389 AIRTEL GIFTING ₦5850.0 18.0 GB ---- 30 days
387 AIRTEL GIFTING ₦29250.0 160.0 GB --- 30 days
388 AIRTEL GIFTING ₦589.0 1.5 GB -- 2 days
386 AIRTEL GIFTING ₦2925.0 8.0 GB --- 30 days
125 AIRTEL GIFTING ₦780.0 1.0 GB --- 7 day
126 AIRTEL GIFTING ₦732.0 2.0 GB --- 2 day
129 AIRTEL GIFTING ₦4875.0 13.0 GB ---30 days
443 AIRTEL "AWOOF GIFTING" ₦450.0 1.5 GB --1days
131 AIRTEL GIFTING ₦980.0 1.5 GB --- 7 days
407 AIRTEL GIFTING ₦975.0 3.0 GB ---- 2 days
133 AIRTEL GIFTING ₦1950.0 3.0 GB --- 30 days
134 AIRTEL GIFTING ₦2437.0 4.0 GB --- 30 days
135 AIRTEL GIFTING ₦2437.0 6.0 GB --- 7 days
136 AIRTEL GIFTING ₦3900.0 10.0 GB --- 30 days
137 AIRTEL GIFTING ₦4875.0 18.0 GB --- 7 days
138 AIRTEL GIFTING ₦2925.0 10.0 GB --- 7 days
139 AIRTEL GIFTING ₦7800.0 25.0 GB --- 30 days
140 AIRTEL GIFTING ₦14630.0 75.0 GB --- 30 days ROUTER PLAN
141 AIRTEL GIFTING ₦19500.0 100.0 GB --- 30 days
212 AIRTEL "CORPORATE GIFTING" ₦460.0 500.0 MB --- 30 days
213 AIRTEL "CORPORATE GIFTING" ₦915.0 1.0 GB --- 30 days
214 AIRTEL "CORPORATE GIFTING" ₦1830.0 2.0 GB --- 30 days
215 AIRTEL "CORPORATE GIFTING" ₦4575.0 5.0 GB --- 30 days
216 AIRTEL "CORPORATE GIFTING" ₦100.0 100.0 MB --- 7 days
217 AIRTEL "CORPORATE GIFTING" ₦310.0 300.0 MB --- 7 days
231 AIRTEL "CORPORATE GIFTING" ₦9100.0 10.0 GB --- 30 days
232 AIRTEL "CORPORATE GIFTING" ₦14400.0 15.0 GB --- 30 days
233 AIRTEL "CORPORATE GIFTING" ₦19200.0 20.0 GB --- 30 days
298 AIRTEL GIFTING ₦9900.0 35.0 GB -- 7 days Unltd Ultra Router
432 AIRTEL "AWOOF GIFTING" ₦50.0 250.0 MB --1days Night Plan
300 AIRTEL GIFTING ₦488.0 1.0 GB --- 1 day
313 AIRTEL "AWOOF GIFTING" ₦50.0 150.0 MB --- 1 day
436 AIRTEL "AWOOF GIFTING" ₦9700.0 35.0 GB ----30days
420 AIRTEL "AWOOF GIFTING" ₦540.0 2.0 GB --- 2 days
441 AIRTEL "AWOOF GIFTING" ₦5000.0 18.0 GB ----7days
317 AIRTEL "AWOOF GIFTING" ₦200000000000.0 7.0 GB --- 7 days not available
318 AIRTEL "AWOOF GIFTING" ₦3020.0 10.0 GB --- 30days
414 AIRTEL GIFTING ₦488.0 500.0 MB --- 7 days
435 AIRTEL "AWOOF GIFTING" ₦7760.0 25.0 GB ----30days
390 AIRTEL "AWOOF GIFTING" ₦4940.0 13.0 GB --- 30days
413 AIRTEL GIFTING ₦293.0 300.0 MB -- 2 days
412 AIRTEL GIFTING ₦98.0 100.0 MB ---- 1 days
408 AIRTEL GIFTING ₦1463.0 3.5 GB ---- 7 days
409 AIRTEL GIFTING ₦1463.0 5.0 GB --- 2 days
410 AIRTEL GIFTING ₦14625.0 60.0 GB --- 30 days
411 AIRTEL GIFTING ₦74.0 75.0 MB --- 1 days
406 AIRTEL GIFTING ₦1463.0 2.0 GB --- 30days
431 AIRTEL "AWOOF GIFTING" ₦60000000000.0 1.5 GB ----2days binge data not avail
429 AIRTEL "AWOOF GIFTING" ₦330.0 1.0 GB -- 3 days Social Bundle
434 AIRTEL "AWOOF GIFTING" ₦970000000000.0 1.5 GB --7days (Weekly plan) not avai
438 AIRTEL "AWOOF GIFTING" ₦20000.0 100.0 GB ---30days
439 AIRTEL "AWOOF GIFTING" ₦1455008088000000.0 3.5 GB ---- 7days Weekly not availab
444 AIRTEL "AWOOF GIFTING" ₦7500000000000.0 2.0 GB not available
445 AIRTEL "AWOOF GIFTING" ₦5000000000000.0 500.0 MB not available
446 AIRTEL "AWOOF GIFTING" ₦530.0 1.5 GB ---1days Social Plan
450 AIRTEL "AWOOF GIFTING" ₦113.0 300.0 MB ---2 days
451 AIRTEL "AWOOF GIFTING" ₦215.0 600.0 MB --- 2 days
452 AIRTEL "AWOOF GIFTING" ₦2400.0 5.0 GB --- 7 days
453 AIRTEL "AWOOF GIFTING" ₦800.0 3.0 GB --- 2days
454 AIRTEL "AWOOF GIFTING" ₦75.0 75.0 MB ---1days
455 AIRTEL "AWOOF GIFTING" ₦3020.0 10.0 GB --- 30days
470 AIRTEL "CORPORATE GIFTING" ₦2475.0 3.0 GB ---30 days
27 GLO GIFTING ₦3720.0 12.5 GB - 30days 12gbday + 2gbnite=12g
28 GLO GIFTING ₦2790.0 10.0 GB -30days 8gday + 2gbnite =10gb
29 GLO GIFTING ₦2325.0 7.5 GB 30days 4.5gbday + 3gb =7.5gb
30 GLO GIFTING ₦1860.0 6.15 GB 30days 3.15gbday+3gbnite=6.25g
31 GLO GIFTING ₦1395.0 5.0 GB 30days. 2gbday + 3gbnite=5gb
32 GLO GIFTING ₦930.0 2.6 GB 30days 1.1gday +1.5gbnite=2.6g
37 GLO GIFTING ₦465.0 1.5 GB - 7days 500mbday +1gb nite
73 GLO GIFTING ₦5580.0 20.5 GB -30 days 18gbday + 2gbnite
74 GLO GIFTING ₦9300.0 38.0 GB --- 30 days
75 GLO GIFTING ₦4650.0 16.0 GB --- 30 days
143 GLO GIFTING ₦13950.0 64.0 GB --- 30 days
144 GLO GIFTING ₦18600.0 107.0 GB --- 30 days
207 GLO GIFTING ₦7440.0 28.0 GB --- 30 days
250 GLO GIFTING ₦1860.0 8.5 GB -7days 6gbday+2.5gbnite=8.5gb
251 GLO GIFTING ₦930.0 3.5 GB ---7days 1.5gbday+2gbnite=3.5g
252 GLO GIFTING ₦698.0 1.1 GB --- 14 days
258 GLO "CORPORATE GIFTING" ₦196.0 500.0 MB --- 30 days
262 GLO "CORPORATE GIFTING" ₦784.0 2.0 GB --- 30 days
261 GLO "CORPORATE GIFTING" ₦392.0 1.0 GB --- 30 days
263 GLO "CORPORATE GIFTING" ₦1176.0 3.0 GB --- 30 days
265 GLO "CORPORATE GIFTING" ₦3920.0 10.0 GB --- 30 days
296 GLO "CORPORATE GIFTING" ₦72.0 200.0 MB --- 14 days
297 GLO "CORPORATE GIFTING" ₦1960.0 5.0 GB --- 30 days
321 GLO "AWOOF GIFTING" ₦190.0 750.0 MB --- 1 day
322 GLO "AWOOF GIFTING" ₦285.0 1.5 GB --- 1 day
323 GLO "AWOOF GIFTING" ₦475.0 2.5 GB ---2 days
324 GLO "AWOOF GIFTING" ₦1900.0 10.0 GB ---7 days
426 GLO GIFTING ₦4650.0 20.5 GB --- 7 days
447 GLO "CORPORATE GIFTING" ₦315.0 1.0 GB ---7days
448 GLO "CORPORATE GIFTING" ₦945.0 3.0 GB ----7days
449 GLO "CORPORATE GIFTING" ₦1575.0 5.0 GB ----7days
50 MTN SME ₦1620.0 2.0 GB --- 30 days
51 MTN SME ₦810.0 1.0 GB ---30days
394 MTN SME ₦485.0 500.0 MB --- 7 days
458 MTN "DATA SHARE" ₦405.0 500.0 MB ---7days
99 MTN "CORPORATE GIFTING" ₦410.0 500.0 MB --- 30 days (C. G)
100 MTN "CORPORATE GIFTING" ₦820.0 1.0 GB --- 30 days (C. G)
101 MTN "CORPORATE GIFTING" ₦1640.0 2.0 GB --- 30 days (C. G)
384 MTN GIFTING ₦48500.0 200.0 GB --- 60 days
385 MTN GIFTING ₦6305.0 16.5 GB --- 30 days
393 MTN "AWOOF GIFTING" ₦970.0 1.5 GB --- 7 days
382 MTN GIFTING ₦33950.0 165.0 GB --- 60 days
380 MTN GIFTING ₦53350.0 250.0 GB --- 30 days
381 MTN GIFTING ₦6790.0 35.0 GB --- 30 days postpaid plan only
379 MTN GIFTING ₦10670.0 36.0 GB --- 30 days
397 MTN GIFTING ₦4365.0 10.0 GB --- 30 days
378 MTN GIFTING ₦970.0 3.2 GB --- 2 days
116 MTN "CORPORATE GIFTING" ₦4400.0 5.0 GB --- 30 days (C. G)
355 MTN GIFTING ₦970.0 1.5 GB --- 7 days
400 MTN GIFTING ₦8730.0 40.0 GB --- 60 days postpaid plan onl
146 MTN "CORPORATE GIFTING" ₦8100.0 10.0 GB --- 30 days (C. G)
149 MTN "CORPORATE GIFTING" ₦16400.0 20.0 GB --- 30 days
150 MTN SME ₦8100.0 10.0 GB --- 30 days
208 MTN "CORPORATE GIFTING" ₦12300.0 15.0 GB --- 30 days
209 MTN "CORPORATE GIFTING" ₦32800.0 40.0 GB --- 30 days
210 MTN "CORPORATE GIFTING" ₦61500.0 75.0 GB --- 30 days
211 MTN "CORPORATE GIFTING" ₦82000.0 100.0 GB --- 30 days
226 MTN "CORPORATE GIFTING" ₦2460.0 3.0 GB --- 30 days
376 MTN "AWOOF GIFTING" ₦3395.0 11.0 GB --7 days
377 MTN GIFTING ₦728.0 1.2 GB --- 7 days
398 MTN GIFTING ₦5335.0 12.5 GB --- 30 days
360 MTN GIFTING ₦17460.0 75.0 GB --- 30 days direct data
253 MTN "CORPORATE GIFTING" ₦205.0 250.0 MB --- 30 days
254 MTN "CORPORATE GIFTING" ₦150.0 150.0 MB --- 30 days
255 MTN "CORPORATE GIFTING" ₦52.0 50.0 MB --- 30 days
266 MTN SME2 ₦266.0 1.0 GB 30 days.
267 MTN SME2 ₦550.0 2.0 GB 30 days.
268 MTN SME2 ₦798.0 3.0 GB 30 days
269 MTN SME2 ₦1375.0 5.0 GB 30 days
270 MTN SME2 ₦2660.0 10.0 GB 30 days
271 MTN SME2 ₦133.0 500.0 MB 30 days
467 MTN "DATA SHARE" ₦950.0 2.0 GB --- 7 days
418 MTN "AWOOF GIFTING" ₦1448.0 1.8 GB --- 30 days plus 335 airtime
416 MTN GIFTING ₦582.0 1.5 GB --- 2 days
375 MTN GIFTING ₦1940.0 2.7 GB --- 30days
403 MTN GIFTING ₦98.0 110.0 MB --- 1 day
404 MTN GIFTING ₦74.0 75.0 MB --- 1 day
401 MTN GIFTING ₦485.0 500.0 MB --- 7 days
402 MTN GIFTING ₦194.0 230.0 MB --- 1 day
457 MTN "DATA SHARE" ₦550.0 1.0 GB ----30days
309 MTN "DATA SHARE" ₦1950.0 5.0 GB 30days
310 MTN "AWOOF GIFTING" ₦483.0 1.0 GB ---1 day
311 MTN "AWOOF GIFTING" ₦970.0 3.2 GB ---2 days
312 MTN "AWOOF GIFTING" ₦2910.0 6.75 GB ---7 days
374 MTN GIFTING ₦2910.0 6.75 GB -- 7 day
373 MTN GIFTING ₦730.0 2.5 GB --- 1 day
396 MTN GIFTING ₦2428.0 3.5 GB --- 30 days
371 MTN GIFTING ₦1455.0 2.0 GB --- 30days
391 MTN "AWOOF GIFTING" ₦2425.0 6.0 GB --- 7 days
368 MTN GIFTING ₦873.0 2.5 GB --- 2 days
367 MTN GIFTING ₦24250.0 90.0 GB --- 60 days
417 MTN SME ₦4050.0 5.0 GB --30days
399 MTN "AWOOF GIFTING" ₦4850.0 14.5 GB --- 7 days Xtra Special Tariff
364 MTN GIFTING ₦728.0 2.0 GB --- 2 days
365 MTN GIFTING ₦780.0 1.0 GB --- 7 days direct data
466 MTN "DATA SHARE" ₦460.0 1.0 GB --- 7 days
366 MTN GIFTING ₦438.0 750.0 MB --- 3 days
421 MTN "AWOOF GIFTING" ₦4840.0 20.0 GB --- 7 days
422 MTN "AWOOF GIFTING" ₦4840.0 20.0 GB --- 7days
423 MTN GIFTING ₦8700.0 25.0 GB --- 30days
424 MTN GIFTING ₦7260.0 20.0 GB ---- 30 days
425 MTN GIFTING ₦3380.0 7.0 GB ---- 7 days
459 MTN "DATA SHARE" ₦1020.0 2.0 GB ---30days
460 MTN "DATA SHARE" ₦1300.0 3.0 GB ---30days
461 MTN GIFTING ₦339.0 500.0 MB ---1day
462 MTN GIFTING ₦120625.0 800.0 GB ---- 1 year
468 MTN "DATA SHARE" ₦1200.0 3.0 GB --- 7 days
471 MTN "AWOOF GIFTING" ₦950.0 5.0 GB --2days
`;

export default function SeedDataPage() {
    const [isSeeding, setIsSeeding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const { toast } = useToast();

    const parseAndSeedData = async () => {
        setIsSeeding(true);
        setProgress(0);
        setLogs(['Starting data seed process...']);

        const lines = dataPlansText.trim().split('\n').filter(line => line.trim() !== '');
        
        // Some plan types are quoted, need to handle that.
        const parsedPlans: Omit<DataPlan, 'id'>[] = [];

        for (const line of lines) {
             // Skip lines that are clearly invalid or marked as 'not available'
            if (line.toLowerCase().includes('not avail')) {
                setLogs(prev => [...prev, `Skipping invalid line: ${line}`]);
                continue;
            }

            const parts = line.split(/\s+/);
            const planId = parts[0];
            const networkName = parts[1];
            
            let planTypeIndex = 2;
            let planType = parts[planTypeIndex];
            if (planType.startsWith('"')) {
                // Handle quoted plan types like "CORPORATE GIFTING"
                const closingQuoteIndex = parts.findIndex((p, i) => i > planTypeIndex && p.endsWith('"'));
                if (closingQuoteIndex !== -1) {
                    planType = parts.slice(planTypeIndex, closingQuoteIndex + 1).join(' ').replace(/"/g, '');
                    planTypeIndex = closingQuoteIndex;
                }
            }

            const priceString = parts.find(p => p.startsWith('₦'));
            if (!priceString) continue;
            const price = parseFloat(priceString.replace('₦', ''));

            const sizeIndex = parts.findIndex(p => p.match(/^\d+(\.\d+)?$/) && (parts[parts.indexOf(p) + 1] === 'GB' || parts[parts.indexOf(p) + 1] === 'MB'));
            if (sizeIndex === -1) continue;
            const name = `${parts[sizeIndex]} ${parts[sizeIndex + 1]}`;

            const validityMatch = line.match(/(\d+\s+days?|1\s+year)/i);
            const validity = validityMatch ? validityMatch[0] : '30 days';

            if (!isNaN(price)) {
                 parsedPlans.push({
                    planId,
                    networkName,
                    planType,
                    name,
                    price,
                    validity,
                    fees: { Customer: 0, Vendor: 0, Admin: 0 },
                });
            } else {
                 setLogs(prev => [...prev, `Could not parse price for line: ${line}`]);
            }
        }
        
        setLogs(prev => [...prev, `Parsed ${parsedPlans.length} plans. Now writing to database...`]);

        try {
            // Firestore allows a maximum of 500 operations in a single batch.
            const batchSize = 499;
            for (let i = 0; i < parsedPlans.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = parsedPlans.slice(i, i + batchSize);
                const dataPlansCollection = collection(db, 'dataPlans');

                chunk.forEach(planData => {
                    const docRef = doc(dataPlansCollection);
                    batch.set(docRef, planData);
                });

                await batch.commit();
                const newProgress = Math.round(((i + chunk.length) / parsedPlans.length) * 100);
                setProgress(newProgress);
                setLogs(prev => [...prev, `Wrote chunk ${i / batchSize + 1}. Progress: ${newProgress}%`]);
            }

            toast({ title: "Seeding Complete!", description: `${parsedPlans.length} data plans have been added to the database.` });
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setLogs(prev => [...prev, `ERROR: ${errorMessage}`]);
            toast({ variant: 'destructive', title: "Seeding Failed", description: errorMessage });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Data Seeding Tool</h1>
                <p className="text-muted-foreground">
                    One-time tool to populate the database with data plans.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Seed Data Plans</CardTitle>
                    <CardDescription>
                        Click the button below to parse the provided data plan list and upload it to the Firestore `dataPlans` collection. This will overwrite any existing plans.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={parseAndSeedData} disabled={isSeeding}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        {isSeeding ? 'Seeding in Progress...' : 'Seed Data Plans'}
                    </Button>

                     {isSeeding && (
                        <div className="mt-4 space-y-2">
                            <Progress value={progress} />
                            <p className="text-sm text-muted-foreground">{progress}% complete</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="max-h-96 overflow-y-auto">
                 <CardHeader>
                    <CardTitle>Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 font-mono text-xs">
                        {logs.map((log, i) => (
                            <p key={i} className={log.startsWith('ERROR') ? 'text-red-500' : ''}>{log}</p>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
