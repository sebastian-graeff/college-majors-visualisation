function barchartrace() {
    d3.csv("CountryYearly.csv", d3.autoType).then(data => {

        const margin = { top: 16, right: 6, bottom: 6, left: 100 };
        const barSize = 60;
        const height = margin.top + barSize * 17 + margin.bottom;
        const width = 960;
        const duration = 250;
        const n = 15;
        const k = 10;
    
        const names = new Set(data.map(d => d.name));
        const datevalues = Array.from(d3.rollup(data, ([d]) => d.value, d => +d.date, d => d.name))
        .map(([date, data]) => [new Date(date), data])
        .sort(([a], [b]) => d3.ascending(a, b));
    
        const svg = d3.select("#vis").append("svg")
        .attr("viewBox", [0, 0, width, height]);
    
        const x = d3.scaleLinear([0, 1], [margin.left, width - margin.right]);
    
        const y = d3.scaleBand()
        .domain(d3.range(n + 1))
        .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
        .padding(0.1);
    
        function rank(value) {
        const data = Array.from(names, name => ({ name, value: value(name) }));
        data.sort((a, b) => d3.descending(a.value, b.value));
        for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
        return data;
        }
    
        function generateKeyframes() {
        const keyframes = [];
        let ka, a, kb, b;
        for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
            for (let i = 0; i < k; ++i) {
            const t = i / k;
            keyframes.push([
                new Date(ka * (1 - t) + kb * t),
                rank(name => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t)
            ]);
            }
        }
        keyframes.push([new Date(kb), rank(name => b.get(name) || 0)]);
        return keyframes;
        }
    
        function bars(svg) {
        let bar = svg.append("g")
            .attr("fill-opacity", 0.6)
            .selectAll("rect");
    
        return ([date, data], transition) => bar = bar
            .data(data.slice(0, n), d => d.name)
            .join(
            enter => enter.append("rect")
                .attr("height", y.bandwidth())
                .attr("x", x(0))
                .attr("y", d => y((prev.get(d) || d).rank))
                .attr("width", d => x((prev.get(d) || d).value) - x(0)),
            update => update,
            exit => exit.transition(transition).remove()
                .attr("y", d => y((next.get(d) || d).rank))
                .attr("width", d => x((next.get(d) || d).value) - x(0))
            )
            .call(bar => bar.transition(transition)
            .attr("y", d => y(d.rank))
            .attr("width", d => x(d.value) - x(0)));
        }
    
        function labels(svg) {
        let label = svg.append("g")
            .style("font", "bold 12px var(--sans-serif)")
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")  // Right align text
            .selectAll("text");
    
        return ([date, data], transition) => label = label
            .data(data.slice(0, n), d => d.name)
            .join(
            enter => enter.append("text")
                .attr("transform", d => `translate(${margin.left - 10},${y((prev.get(d) || d).rank)})`) // Positioned to the left of the bars
                .attr("y", y.bandwidth() / 2)
                .attr("x", 0)
                .attr("dy", "-0.25em")
                .text(d => d.name),
            update => update,
            exit => exit.transition(transition).remove()
                .attr("transform", d => `translate(${margin.left - 10},${y((next.get(d) || d).rank)})`)
            )
            .call(label => label.transition(transition)
            .attr("transform", d => `translate(${margin.left - 10},${y(d.rank)})`)); // Translate to new rank position
        }
    
    
    
        function axis(svg) {
        const g = svg.append("g")
            .attr("transform", `translate(0,${margin.top})`);
    
        return (_, transition) => {
            const axis = d3.axisTop(x).ticks(width / 160).tickSizeOuter(0).tickSizeInner(-barSize * (n + y.padding()));
            g.transition(transition).call(axis);
            g.select(".tick:first-of-type text").remove();
            g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
            g.select(".domain").remove();
        };
        }
    
        function ticker(svg) {
        const now = svg.append("text")
            .style("font", `bold ${barSize}px var(--sans-serif)`)
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .attr("x", width - 6)
            .attr("y", margin.top + barSize * (n - 0.45))
            .attr("dy", "0.32em");
    
        return ([date], transition) => {
            transition.end().then(() => now.text(d3.utcFormat("%Y")(date)));
        };
        }
    
        const keyframes = generateKeyframes();
        const nameframes = d3.groups(keyframes.flatMap(([, data]) => data), d => d.name);
        const prev = new Map(nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])));
        const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)));
    

        // Finally, the loop that updates the chart.
        (async () => {
        const updateBars = bars(svg);
        const updateLabels = labels(svg);
        const updateAxis = axis(svg);
        const updateTicker = ticker(svg);

        for (const keyframe of keyframes) {
        const transition = svg.transition()
            .duration(duration)
            .ease(d3.easeLinear);

        x.domain([0, keyframe[1][0].value]);

        updateBars(keyframe, transition);
        updateLabels(keyframe, transition);
        updateAxis(keyframe, transition);
        updateTicker(keyframe, transition);

        await transition.end();
        }
    })();
    });
}