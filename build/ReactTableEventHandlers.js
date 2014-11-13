function ReactTableGetInitialState() {
    // the holy grail of table state - describes structure of the data contained within the table
    var rootNode = createTree(this.props);
    return {
        rootNode: rootNode,
        uniqueId: uniqueId("table"),
        currentPage: 1,
        height: this.props.height,
        columnDefs: this.props.columnDefs
    };
}

function ReactTableHandleSort(columnDefToSortBy, sortAsc) {
    this.state.rootNode.sortChildren(getSortFunction(columnDefToSortBy).bind(columnDefToSortBy), true, sortAsc);
    this.setState({rootNode: this.state.rootNode});
}

function ReactTableHandleGroupBy(columnDef, buckets) {
    if (buckets && buckets != "" && columnDef)
        columnDef.groupByRange = _createFloatBuckets(buckets);
    this.props.groupBy = columnDef ? [columnDef] : null;
    var rootNode = createTree(this.props);
    this.setState({
        rootNode: rootNode,
        currentPage: 1
    });
}
function ReactTableHandleAdd() {
    if (this.props.beforeColumnAdd)
        this.props.beforeColumnAdd();
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
    summaryRow.treeNode.collapsed = !summaryRow.treeNode.collapsed;
    this.setState({rootNode: this.state.rootNode});
}

function ReactTableHandlePageClick(page, event) {
    event.preventDefault();
    this.setState({
        currentPage: page
    });
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */
function _createFloatBuckets(buckets) {
    var i, stringBuckets, floatBuckets = [];
    stringBuckets = buckets.split(",");
    for (i = 0; i < stringBuckets.length; i++) {
        var floatBucket = parseFloat(stringBuckets[i]);
        if (!isNaN(floatBucket))
            floatBuckets.push(floatBucket);
    }
    floatBuckets.sort(function (a, b) {
        return a - b;
    });
    return floatBuckets;
}