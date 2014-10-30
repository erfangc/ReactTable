function ReactTableHandleSort(columnDefToSortBy) {
    var data = this.state.data;
    var sortOptions = {
        sectorSorter: defaultSectorSorter,
        detailSorter: getSortFunction(columnDefToSortBy),
        sortDetailBy: columnDefToSortBy
    };
    data.sort(sorterFactory.call(this, sortOptions));
    columnDefToSortBy.asc = !columnDefToSortBy.asc;
    this.setState({
        data: data
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

function ReactTableHandleToggleHide(summaryRow) {
    var sectorKey = generateSectorKey(summaryRow.sectorPath);
    if (this.state.collapsedSectorPaths[sectorKey] == null)
        this.state.collapsedSectorPaths[sectorKey] = summaryRow.sectorPath;
    else
        delete this.state.collapsedSectorPaths[sectorKey];
    this.setState({
        collapsedSectorPaths: this.state.collapsedSectorPaths
    });
}

function ReactTableHandleRowSelect(row) {
    var rowKey = this.props.rowKey;
    if (!rowKey || !row.isDetail)
        return
    if (this.props.onSelectCallback)
        this.props.onSelectCallback.call(this, row);

    var selectedRows = this.state.selectedRows;
    if (!selectedRows[row[rowKey]])
        selectedRows[row[rowKey]] = 1;
    else
        delete selectedRows[row[rowKey]];
    this.setState({selectedRows: selectedRows});
}

function ReactTableHandlePageClick(page) {
    var pageSize = this.props.pageSize || 10;
    var maxPage = Math.ceil(this.state.data.length / pageSize);
    if (page < 1 || page > maxPage)
        return;
    this.setState({
        currentPage: page
    });
}