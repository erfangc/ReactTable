/**
 * - STOP -
 *
 * please do not add too many states to the table. Per react.js documentation for best practices, any value derivable from props alone should NOT be stored as a state
 * but instead should be computed each time as the render() function.
 *
 * states are used to store info that cannot be inferred or derived from 'props', such as user interaction that occur within the component (collapsing a subtotal grouping / adding a column to sort)
 *
 * @returns {{rootNode: the, uniqueId: *, currentPage: number, columnDefs: (*|Array|newColumnDefs), selectedDetailRows: (*|results.selectedDetailRows|{}|selectedDetailRows), selectedSummaryRows: (*|results.selectedSummaryRows|{}|selectedSummaryRows), extraStyle: {}, rows: Array, hasMoreRows: boolean, itemsPerScroll: *, filterInPlace: {}, currentFilters: Array}}
 * @constructor
 */
function ReactTableGetInitialState() {
    // the holy grail of table state - describes structure of the data contained within the table
    var rootNode = createTree(this.props);
    var selections = getInitialSelections(this.props.selectedRows, this.props.selectedSummaryRows);

    /**
     * please document justification as state
     */
    return {
        rootNode: rootNode, // justifiable as a state because its children contain sub-states like collapse/expanded
        uniqueId: uniqueId("table"), // i guess since this is randomly generated, it is not derivable from props alone
        currentPage: 1, // self-explanatory
        lastScrollTop: 0, // self-explanatory, this is the spiritual of currentPage for paginators
        columnDefs: this.props.columnDefs, // this is really a modifiable prop, but fine ...
        selectedDetailRows: selections.selectedDetailRows, // another modifiable prop ... so fine ..
        selectedSummaryRows: selections.selectedSummaryRows, // save as above
        lowerVisualBound: 0,
        upperVisualBound: this.props.pageSize,
        extraStyle: {}, // TODO document use
        rows: [], // TODO the current row components being rendered, this is DEFINITELY not a state ... it should be determined based on props and other states in the render() function
        filterInPlace: {}, // TODO document use, but sounds like a legit state
        currentFilters: [] // TODO same as above
    };
}

function ReactTableHandleSelect(selectedRow) {
    var rowKey = this.props.rowKey, state;
    if (rowKey == null)
        return;
    if (selectedRow.isDetail != null & selectedRow.isDetail == true) {
        state = this.toggleSelectDetailRow(selectedRow[rowKey]);
        this.props.onSelectCallback(selectedRow, state);
    } else {
        state = this.toggleSelectSummaryRow(generateSectorKey(selectedRow.sectorPath));
        this.props.onSummarySelectCallback(selectedRow, state);
    }
}

function ReactTableHandleColumnFilter(columnDefToFilterBy, e, dontSet) {
    if (typeof dontSet !== "boolean")
        dontSet = undefined;

    var filterData = e.target ? (e.target.value || e.target.textContent) : e;
    var caseSensitive = !(this.props.filtering && this.props.filtering.caseSensitive === false);

    if (!dontSet) {
        // Find if this column has already been filtered.  If it is, we need to remove it before filtering again
        for (var i = 0; i < this.state.currentFilters.length; i++) {
            if (this.state.currentFilters[i].colDef === columnDefToFilterBy) {
                this.state.currentFilters.splice(i, 1);
                this.handleClearFilter(columnDefToFilterBy, true);
                break;
            }
        }
    }

    var customFilterer;
    if (this.props.filtering && this.props.filtering.customFilterer) {
        customFilterer = this.props.filtering.customFilterer;
    }
    this.state.rootNode.filterByColumn(columnDefToFilterBy, filterData, caseSensitive, customFilterer);

    if (!dontSet) {
        this.state.currentFilters.push({colDef: columnDefToFilterBy, filterText: filterData});
        $("input.rt-" + columnDefToFilterBy.colTag + "-filter-input").val(filterData);
        this.setState({rootNode: this.state.rootNode, currentFilters: this.state.currentFilters});
    }
}

function ReactTableHandleRemoveFilter(colDef, dontSet) {
    if (typeof dontSet !== "boolean")
        dontSet = undefined;

    // First clear out all filters
    for (var i = 0; i < this.state.rootNode.ultimateChildren.length; i++) {
        this.state.rootNode.ultimateChildren[i].hiddenByFilter = false;
    }
    // Remove filter from list of current filters
    for (i = 0; i < this.state.currentFilters.length; i++) {
        if (this.state.currentFilters[i].colDef === colDef) {
            this.state.currentFilters.splice(i, 1);
            break;
        }
    }
    // Re-filter by looping through old filters
    for (i = 0; i < this.state.currentFilters.length; i++) {
        this.handleColumnFilter(this.state.currentFilters[i].colDef, this.state.currentFilters[i].filterText, true);
    }

    if (!dontSet) {
        var fip = this.state.filterInPlace;
        delete fip[colDef.colTag];
        this.setState({
            filterInPlace: fip,
            rootNode: this.state.rootNode,
            currentFilters: this.state.currentFilters
        });
        $("input.rt-" + colDef.colTag + "-filter-input").val("");
    }
}

function ReactTableHandleRemoveAllFilters() {
    recursivelyClearFilters(this.state.rootNode);
    this.setState({
        filterInPlace: {},
        rootNode: this.state.rootNode,
        currentFilters: []
    });
    $("input.rt-filter-input").val("");
}

function recursivelyClearFilters(node) {
    node.clearFilter();

    for (var i = 0; i < node.children.length; i++) {
        recursivelyClearFilters(node.children[i]);
    }

    if (!node.hasChild()) {
        for (var i = 0; i < node.ultimateChildren.length; i++) {
            node.ultimateChildren[i].hiddenByFilter = false;
        }
    }
}

function reApplyAllFilters() {
    for (var i = 0; i < this.state.currentFilters.length; i++) {
        this.handleColumnFilter(this.state.currentFilters[i].colDef, this.state.currentFilters[i].filterText, true);
    }
    this.setState({rootNode: this.state.rootNode});
}

function ReactTableHandleSort(columnDefToSortBy, sortAsc) {
    var sortFn = getSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    var reverseSortFn = getReverseSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    this.state.rootNode.sortChildren({
        sortFn: sortFn,
        reverseSortFn: reverseSortFn,
        recursive: true,
        sortAsc: sortAsc
    });
    this.props.currentSortStates = [sortAsc ? sortFn : reverseSortFn];
    this.setState({
        rootNode: this.state.rootNode,
        sortAsc: sortAsc,
        columnDefSorted: columnDefToSortBy,
        filterInPlace: {}
    });
}

function ReactTableHandleAddSort(columnDefToSortBy, sortAsc) {
    // If it's not sorted yet, sort normally
    if (!this.props.currentSortStates || this.props.currentSortStates.length == 0) {
        this.handleSort(columnDefToSortBy, sortAsc);
        return;
    }
    var sortFn = getSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    var reverseSortFn = getReverseSortFunction(columnDefToSortBy).bind(columnDefToSortBy);
    this.state.rootNode.addSortToChildren({
        sortFn: sortFn,
        reverseSortFn: reverseSortFn,
        recursive: true,
        sortAsc: sortAsc,
        oldSortFns: this.props.currentSortStates
    });
    this.props.currentSortStates.push(sortAsc ? sortFn : reverseSortFn);
    this.setState({
        rootNode: this.state.rootNode,
        sortAsc: sortAsc,
        columnDefSorted: columnDefToSortBy,
        filterInPlace: {}
    });
}

function ReactTableHandleGroupBy(columnDef, buckets) {

    if (buckets != null && buckets != "" && columnDef)
        columnDef.groupByRange = partitionNumberLine(buckets);
    if (columnDef != null) {
        this.props.groupBy = this.props.groupBy || [];
        this.props.groupBy.push(columnDef);
    } else
        this.props.groupBy = null;

    this.state.rootNode = createTree(this.props);

    if (this.state.currentFilters.length > 0) {
        reApplyAllFilters.call(this);
    }

    this.setState({
        rootNode: this.state.rootNode,
        currentPage: 1,
        lowerVisualBound: 0,
        upperVisualBound: this.props.pageSize,
        firstColumnLabel: buildFirstColumnLabel(this)
    });
}

function ReactTableHandleAdd() {
    if (this.props.beforeColumnAdd)
        this.props.beforeColumnAdd(this);
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

function ReactTableHandlePageClick(page) {
    this.setState({
        currentPage: page
    });

}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */
function partitionNumberLine(buckets) {
    var i = 0, stringBuckets, floatBuckets = [];
    stringBuckets = buckets.split(",");
    for (i = 0; i < stringBuckets.length; i++) {
        var floatBucket = parseFloat(stringBuckets[i]);
        if (!isNaN(floatBucket))
            floatBuckets.push(floatBucket);
        floatBuckets.sort(function (a, b) {
            return a - b;
        });
    }
    return floatBuckets;
}

function buildFirstColumnLabel(table) {
    var result = [];
    if (table.props.groupBy) {
        for (var i = 0; i < table.props.groupBy.length; i++)
            result.push(table.props.groupBy[i].text);
    }
    result.push(table.props.columnDefs[0].text);
    return result;
}

function getInitialSelections(selectedRows, selectedSummaryRows) {
    var results = {selectedDetailRows: {}, selectedSummaryRows: {}};
    if (selectedRows != null) {
        for (var i = 0; i < selectedRows.length; i++)
            results.selectedDetailRows[selectedRows[i]] = 1;
    }
    if (selectedSummaryRows != null) {
        for (var i = 0; i < selectedSummaryRows.length; i++)
            results.selectedSummaryRows[selectedSummaryRows[i]] = 1;
    }
    return results;
}
