/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.auraframework.test.perf.metrics;

import org.auraframework.test.UnitTestCase;

public final class PerfMetricsComparatorTest extends UnitTestCase {

    public void testCompare() throws Exception {
        PerfMetrics expected = new PerfMetrics();
        expected.setMetric("Timeline.metric", 10);
        expected.setMetric("Aura.metric", 10);

        PerfMetricsComparator comparator = new PerfMetricsComparator();
        PerfMetrics actual;
        String message;

        // UC: no message if exactly the same
        actual = new PerfMetrics();
        actual.setMetric("Timeline.metric", 10);
        actual.setMetric("Aura.metric", 10);
        message = comparator.compare(expected, actual);
        assertNull(message, message);

        // UC: no message if within bounds
        actual = new PerfMetrics();
        actual.setMetric("Timeline.metric", 9);
        actual.setMetric("Aura.metric", 10);
        message = comparator.compare(expected, actual);
        assertNull(message, message);

        // UC: message if not within bounds
        actual = new PerfMetrics();
        actual.setMetric("Timeline.metric", 5);
        actual.setMetric("Aura.metric", 10);
        message = comparator.compare(expected, actual);
        assertEquals("--> perf metric out of range: Timeline.metric - expected 10, actual 5", message);
        actual = new PerfMetrics();
        actual.setMetric("Timeline.metric", 9);
        actual.setMetric("Aura.metric", 8);
        message = comparator.compare(expected, actual);
        assertEquals("--> perf metric out of range: Aura.metric - expected 10, actual 8", message);

        // UC: message if metric missing
        actual = new PerfMetrics();
        actual.setMetric("Timeline.metric", 10);
        message = comparator.compare(expected, actual);
        assertEquals("--> perf metric out of range: Aura.metric - expected 10, actual 0", message);
        // UC: allow at least 1 for small ints
        expected = new PerfMetrics();
        expected.setMetric("Timeline.metric", 3);
        actual = new PerfMetrics();
        actual.setMetric("Timeline.metric", 2);
        message = comparator.compare(expected, actual);
        assertNull(message, message);

        // UC: show non-sorted sequence for MedianPerfMetrics
        expected = new PerfMetrics();
        expected.setMetric("Network.bytes", 0);
        PerfMetrics run1 = new PerfMetrics();
        run1.setMetric("Network.bytes", 3);
        PerfMetrics run2 = new PerfMetrics();
        run2.setMetric("Network.bytes", 4);
        PerfMetrics run3 = new PerfMetrics();
        run3.setMetric("Network.bytes", 2);
        PerfRunsCollector collector = new PerfRunsCollector();
        collector.addRun(run1);
        collector.addRun(run2);
        collector.addRun(run3);
        actual = collector.getMedianMetrics();
        message = comparator.compare(expected, actual);
        assertEquals("--> perf metric out of range: Network.bytes - expected 0, actual 3 [3 4 2]", message);
        actual = collector.getMedianRun();
        message = comparator.compare(expected, actual);
        assertEquals("--> perf metric out of range: Network.bytes - expected 0, actual 3 [3 4 2]", message);
    }
}
