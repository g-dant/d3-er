Promise.all([
    d3.csv('./data/fks.csv'), 
    d3.csv('./data/tables.csv')
]).then(d => {
    
    console.log(d[2])
    
    let table_data = {};
    for (var i = 0; i < d[1].length; i++) {
        table_data[d[1][i].NAME] = { 
            n_rows: d[1][i].NUM_ROWS, 
            n_cols: d[1][i].NUM_COLS,
            type: d[1][i].TYPE
        };
    }
    
    let de_tabl_all = d[0].map(d => d.DE_TABL);
    let de_tabl_refe_all = d[0].map(d => d.DE_TABL_REFE);
    
    let nodes_data = [...new Set([...de_tabl_all, ...de_tabl_refe_all])].map(x => {
        
        let table_has_registers = Object.keys(table_data).includes(x);
        
        let n_rows = table_has_registers ? table_data[x]['n_rows'] : 0;
        let n_cols = table_has_registers ? table_data[x]['n_cols'] : 0;
        let type = table_has_registers ? table_data[x]['type'] : 0;
        
        return { 
            name: x, 
            n_rows: n_rows,
            n_cols: n_cols,
            type: type
        };
    });
    
    let links_data = d[0].map(d => { return { source: d.DE_TABL, target: d.DE_TABL_REFE } });
    
    nodes_data = nodes_data.filter(n => { return n.n_rows > 0 && n.n_cols > 0; });
    links_data = links_data.filter(function(link) {
        let nodes_list = nodes_data.map(n => n.name);
        return nodes_list.includes(link.source) && nodes_list.includes(link.target);
    });
    
    return { nodes_data: nodes_data, links_data: links_data };
}).
then(d => {
    
    //create somewhere to put the force directed graph
    var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");
    
    var node_width = 14;
    var node_height = 28;  
    
    var nodes_data = d.nodes_data;
    var links_data = d.links_data;
    
    //set up the simulation and add forces  
    var simulation = d3.forceSimulation()
    .nodes(nodes_data);
    
    var link_force =  d3.forceLink(links_data)
    .id(function(d) { return d.name; });            
    
    var charge_force = d3.forceManyBody()
    .strength(-100); 
    
    var center_force = d3.forceCenter(width / 2, height / 2);  
    
    simulation
    .force("charge_force", charge_force)
    .force("center_force", center_force)
    .force("links",link_force)
    ;
    
    //add tick instructions: 
    simulation.on("tick", tickActions );
    
    //add encompassing group for the zoom 
    var g = svg.append("g")
    .attr("class", "everything");
    
    colorScale = d3.scaleOrdinal().
    domain([...new Set(d.nodes_data.map(x => x.name.substr(0, 2)))]).
    range(d3.schemeSet3);
    
    //draw lines for the links 
    var link = g.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links_data)
    .enter().append("line")
    .attr("stroke-width", 2)
    .attr("opacity", 0.5)
    .style("stroke", linkColour);      
    
    //draw rect for the nodes 
    var node = g.append("g")
    .attr("class", "nodes") 
    .selectAll("rect")
    .data(nodes_data)
    .enter()
    .append("rect")
    .attr("width", node_width)
    .attr("height", node_height)
    .attr("stroke", "black")
    .attr("fill", function(x) { return colorScale(x.type); })
    .on('click', show_node);
    
    //add drag capabilities  
    var drag_handler = d3.drag()
    .on("start", drag_start)
    .on("drag", drag_drag)
    .on("end", drag_end);	
    
    drag_handler(node);
    
    
    //add zoom capabilities 
    var zoom_handler = d3.zoom()
    .on("zoom", zoom_actions);
    
    zoom_handler(svg);
    
    /** Functions **/
    
    //Function to choose the line colour and thickness 
    function linkColour(d){
        return "black";
    }
    
    //Drag functions 
    //d is the node 
    function drag_start(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    //make sure you can't drag the rect outside the box
    function drag_drag(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }
    
    function drag_end(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    //Zoom functions 
    function zoom_actions(){
        g.attr("transform", d3.event.transform)
    }
    
    function tickActions() {
        //update circle positions each tick of the simulation 
        node
        .attr("x", function(d) { return d.x - node_width / 2; })
        .attr("y", function(d) { return d.y - node_height / 2; });
        
        //update link positions 
        link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    }
    
    function show_node(d) {
        Swal.fire({
            imageUrl: `./static/icons/${img_urls[ d.type ]}`,
            imageWidth: 150,
            html: `
                <h3>Table ${ d.name }:</h3>
                <h6>System Type: ${ d.type } </h6>
                <ul>
                    <li><b>Rows count</b>: ${ d.n_rows }</li>
                    <li><b>Columns count</b>: ${ d.n_cols }</li>
                </ul>`
        });
    }
    
    return d.nodes_data.map(x => x.type);
}).then(d => {
    d3.select('#subtitles').selectAll("div")
    .data([...new Set(d)])
    .enter()
    .append("div")
    .html(d => { return `
        <p>
            <div style="display: inline; color: ${ colorScale(d) }; 
                background-color: ${ colorScale(d) }; 
                border: 1px solid black;">
                &#x25A0;
            </div>&nbsp;-&nbsp;${ d }
        </p>
    `});
})