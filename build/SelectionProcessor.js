/* Main Event Handler */
function ReactHandleRowSelect(row) {
    "use strict";
    var selectionSubType = null,
        selectionKey = null,
        becameSelected = false,
        callbackProcessingDelegate = null;

    if (row.isDetail) {
        selectionSubType = 'detailRows';
        selectionKey = generateRowKey(row, this.props.rowKey);
        callbackProcessingDelegate = processDetailRowSelect;
    } else {
        selectionSubType = 'summaryRows';
        selectionKey = generateSectorKey(row.sectorPath);
        callbackProcessingDelegate = processSummaryRowSelect;
    }

    if (isRowSelected.call(this, row))
        delete this.state.selectedRows[selectionSubType][selectionKey];
    else {
        this.state.selectedRows[selectionSubType][selectionKey] = 1;
        becameSelected = true;
    }

    // invoke callback processing logic
    callbackProcessingDelegate.call(this, row, becameSelected);
    this.setState({
        selectedRows: this.state.selectedRows
    });
}

/* Helper Functions */
function processSummaryRowSelect(summaryRow, selectionState) {
    "use strict";
    var result = {detailRows: [], summaryRow: summaryRow}, i = 0, dataSize = this.state.data.length, row = null;
    for (i = 0; i < dataSize; i++) {
        row = this.state.data[i];
        if (row.isDetail &&
            (isSubSectorOf(row.sectorPath, summaryRow.sectorPath) ||
            sectorPathMatchesExactly(row.sectorPath, summaryRow.sectorPath))
        )
            result.detailRows.push(row);
    }
    if (this.props.onSummarySelectCallback)
        this.props.onSummarySelectCallback.call(this, result, selectionState);
}

function processDetailRowSelect(row, selectionState) {
    "use strict";
    var rowKey = this.props.rowKey;
    if (!rowKey)
        return;
    if (this.props.onSelectCallback)
        this.props.onSelectCallback.call(this, row, selectionState);
}

function getInitiallySelectedRows(selectedRowKeys) {
    var result = {detailRows: {}, summaryRows: {}};
    selectedRowKeys = selectedRowKeys || [];
    for (var i = 0; i < selectedRowKeys.length; i++)
        result.detailRows[selectedRowKeys[i]] = 1;
    return result;
}

function isRowSelected(row) {
    var result = false, sectorPathKey = null, rowKey = null;
    if (row.isDetail) {
        rowKey = generateRowKey(row, this.props.rowKey);
        result = (this.state.selectedRows.detailRows[rowKey] != null);
    } else {
        sectorPathKey = generateSectorKey(row.sectorPath);
        result = (this.state.selectedRows.summaryRows[sectorPathKey] != null);
    }
    return result;
}
