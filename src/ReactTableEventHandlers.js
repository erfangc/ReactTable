function ReactTableGetInitialState() {
    var rootNode = createTree(this.props);
    // TODO put this in render
    var data = rasterizeTree(rootNode, this.props.columnDefs[0]);
    return {
        // the holy grail of table state - describes structure of the data contained within the table
        rootNode: rootNode,

        uniqueId: uniqueId("table"),
        currentPage: 1,
        height: this.props.height,
        columnDefs: this.props.columnDefs
    };
}

/**
 * Converts the table state from a tree format to a array of rows for rendering
 * @param rootNode
 * @return {Array}
 */
function rasterizeTree(node, firstColumn) {
    var flatData = [], intermediateResult, i, j;
    node.rowData.sectorPath = node.getSectorPath();
    node.rowData[firstColumn.colTag] = node.sectorTitle;
    if (node.parent != null) {
        flatData.push(node.rowData);
    }
    if (node.children.length > 0) {
        for (i = 0; i < node.children.length; i++) {
            intermediateResult = rasterizeTree(node.children[i], firstColumn);
            for (j = 0; j < intermediateResult.length; j++)
                flatData.push(intermediateResult[j]);
        }
    } else {
        // attach ultimate children - b/c this is a detail row
        for (i = 0; i < node.ultimateChildren.length; i++) {
            var detailRow = node.ultimateChildren[i];
            detailRow.sectorPath = node.rowData.sectorPath;
            detailRow.isDetail = true;
            flatData.push(detailRow);
        }
    }
    return flatData;
}

// --------------New Functions -----------------------

/**
 * Transform the current props into a tree structure representing the complex state
 * @param tableProps
 * @return the root Node element of the tree with aggregation
 */
function createTree(tableProps) {
    var rootNode = buildTreeSkeleton(tableProps);
    recursivelyAggregateNodes(rootNode, tableProps);
    return rootNode;
}

/**
 * Creates the data tree backed by props.data and grouped columns specified in groupBy
 * @param tableProps
 * @return {Node} the root node
 */
function buildTreeSkeleton(tableProps) {
    var rootNode = new Node("Root", null), rawData = tableProps.data, i;
    for (i = 0; i < rawData.length; i++) {
        rootNode.appendRow(rawData[i]);
        populateChildNodesForRow(rootNode, rawData[i], tableProps.groupBy);
    }
    return rootNode
}

function populateChildNodesForRow(rootNode, row, groupBy) {
    var i, currentNode = rootNode;
    for (i = 0; i < groupBy.length; i++) {
        var sectorName = getSectorName(row, groupBy[i]);
        currentNode = currentNode.appendRowToChildren(sectorName, row);
    }
}

function recursivelyAggregateNodes(node, tableProps) {
    // aggregate the current node
    node.rowData = aggregateSector(node.ultimateChildren, tableProps.columnDefs, tableProps.groupBy);

    // for each child - aggregate those as well
    if (node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++) {
            recursivelyAggregateNodes(node.children[i], tableProps);
        }
    }
}

// --------------------------------------------------------
function ReactTableHandleSort(columnDefToSortBy, sortAsc) {
    var data = this.state.data;
    var sortOptions = {
        sectorSorter: defaultSectorSorter,
        sortSummaryBy: columnDefToSortBy,
        detailSorter: getSortFunction(columnDefToSortBy),
        sortDetailBy: columnDefToSortBy,
        sortAsc: sortAsc
    };
    data.sort(sorterFactory.call(this, sortOptions));
    this.setState({
        data: data,
        sorting: columnDefToSortBy
    });
}

function ReacTableHandleGroupBy(columnDef, buckets) {
    if (buckets && buckets != "" && columnDef) {
        columnDef.groupByRange = createFloatBuckets(buckets);
    }
    this.props.groupBy = columnDef ? [columnDef] : null;
    var initialStates = prepareTableData.call(this, this.props);
    this.state.selectedRows.summaryRows = [];
    this.setState({
        currentPage: 1,
        data: initialStates.data,
        selectedRows: this.state.selectedRows,
        collapsedSectorPaths: initialStates.collapsedSectorPaths,
        collapsedSectorKeys: initialStates.collapsedSectorKeys
    });
}

function ReactTableHandleAdd() {
    if (this.props.beforeColumnAdd)
        this.props.beforeColumnAdd()
}

function ReactTableHandleRemove(columnDefToRemove) {
    var loc = this.state.columnDefs.indexOf(columnDefToRemove);
    var newColumnDefs = [];
    for (var i = 0; i < this.state.columnDefs.length; i++) {
        if (i != loc)
            newColumnDefs.push(this.state.columnDefs[i]);
    }
    this.setState({
        columnDefs: newColumnDefs
    });
    // TODO pass copies of these variables to avoid unintentional perpetual binding
    if (this.props.afterColumnRemove != null)
        this.props.afterColumnRemove(newColumnDefs, columnDefToRemove);
}

function ReactTableHandleToggleHide(summaryRow, event) {
    event.stopPropagation();
    var sectorKey = generateSectorKey(summaryRow.sectorPath);
    if (this.state.collapsedSectorPaths[sectorKey] == null) {
        this.state.collapsedSectorPaths[sectorKey] = summaryRow.sectorPath;
        this.state.collapsedSectorKeys.push(sectorKey);
    }
    else {
        delete this.state.collapsedSectorPaths[sectorKey];
        this.state.collapsedSectorKeys.splice(this.state.collapsedSectorKeys.indexOf(sectorKey), 1);
    }
    this.setState({
        collapsedSectorPaths: this.state.collapsedSectorPaths,
        collapsedSectorKeys: this.state.collapsedSectorKeys
    });
}

function ReactTableHandlePageClick(page, event) {
    event.preventDefault();
    var pageSize = this.props.pageSize || 10;
    var maxPage = Math.ceil(this.state.data.length / pageSize);
    if (page < 1 || page > maxPage)
        return;
    this.setState({
        currentPage: page
    });
}

/* Helpers */
function createFloatBuckets(buckets) {
    var i = 0, stringBuckets, floatBuckets = [];
    stringBuckets = buckets.split(",");
    for (i = 0; i < stringBuckets.length; i++)
         var floatBucket = parseFloat(stringBuckets[i]);
    if (!isNaN(floatBucket))
        floatBuckets.push(floatBucket);
    floatBuckets.sort();
    return floatBuckets;
}