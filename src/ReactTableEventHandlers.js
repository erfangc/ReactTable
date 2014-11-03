function ReactTableGetInitialState() {
    var data = prepareTableData.call(this, this.props);
    var collapsedSectorPaths = getInitiallyCollapsedSectorPaths(data);

    // optimization code for sector path key retrieval so we do not need for (var in collect) syntax for each row
    var collapsedSectorKeys = [];
    for (var key in collapsedSectorPaths)
        if (collapsedSectorPaths.hasOwnProperty(key))
            collapsedSectorKeys.push(key);

    var selectedRows = getInitiallySelectedRows(this.props.selectedRows);
    return {
        uniqueId: uniqueId("table"),
        currentPage: 1,
        height: this.props.height,
        data: data,
        columnDefs: this.props.columnDefs,
        collapsedSectorPaths: collapsedSectorPaths,
        collapsedSectorKeys: collapsedSectorKeys,
        selectedRows: selectedRows
    };
}

function ReactTableHandleSort(columnDefToSortBy, sortAsc) {
    var data = this.state.data;
    var sortOptions = {
        sectorSorter: defaultSectorSorter,
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

function ReacTableHandleGroupBy (columnDef) {
    var props = this.props;
    props.groupBy = [columnDef];
    var data = prepareTableData.call(this, props);
    var collapsedSectorPaths = getInitiallyCollapsedSectorPaths(data);

    // optimization code for sector path key retrieval so we do not need for (var in collect) syntax for each row
    var collapsedSectorKeys = [];
    for (var key in collapsedSectorPaths)
        if (collapsedSectorPaths.hasOwnProperty(key))
            collapsedSectorKeys.push(key);

    this.setState({
        data: data,
        collapsedSectorPaths: collapsedSectorPaths,
        collapsedSectorKeys: collapsedSectorKeys
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