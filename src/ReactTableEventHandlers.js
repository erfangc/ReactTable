function ReactTableGetInitialState() {
    var initialStates = prepareTableData.call(this, this.props);
    var selectedRows = getInitiallySelectedRows(this.props.selectedRows);
    return {
        uniqueId: uniqueId("table"),
        currentPage: 1,
        height: this.props.height,
        data: initialStates.data,
        columnDefs: this.props.columnDefs,
        collapsedSectorPaths: initialStates.collapsedSectorPaths,
        collapsedSectorKeys: initialStates.collapsedSectorKeys,
        selectedRows: selectedRows
    };
}

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
function extractSectorPathKeys(collapsedSectorPaths) {
    "use strict";
    var results = [];
    for (var key in collapsedSectorPaths)
        if (collapsedSectorPaths.hasOwnProperty(key))
            results.push(key);
    return results;
}

function prepareTableData(props) {
    // make defensive copy of the data - surprisingly not a huge performance hit
    var data = deepCopyData(props.data);
    if (props.groupBy) {
        data = groupData(data, props.groupBy, props.columnDefs);
        var sortOptions = {sectorSorter: defaultSectorSorter, detailSorter: defaultDetailSorter};
        data.sort(sorterFactory.call(this, sortOptions));
    }
    // optimization code for sector path key retrieval so we do not need for (var in collect) syntax for each row
    var collapsedSectorPaths = getInitiallyCollapsedSectorPaths(data);
    return {
        collapsedSectorPaths: collapsedSectorPaths,
        collapsedSectorKeys: extractSectorPathKeys(collapsedSectorPaths),
        data: data
    };
}

function createFloatBuckets(buckets) {
    var i = 0, stringBuckets, floatBuckets = [];
    stringBuckets = buckets.split(",");
    for (i = 0; i < stringBuckets.length; i++) {
        var floatBucket = parseFloat(stringBuckets[i]);
        if (!isNaN(floatBucket))
            floatBuckets.push(floatBucket);
        floatBuckets.sort(function (a,b) {
            return a - b;
        });
    }
    return floatBuckets;
}