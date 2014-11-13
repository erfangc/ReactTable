/**
 * Converts the table state from a tree format to a array of rows for rendering
 * @param rootNode
 * @return {Array}
 */
function rasterizeTree(options) {
    var node = options.node, firstColumn = options.firstColumn, selectedDetailRows = options.selectedDetailRows;

    var flatData = [];

    node = _decorateRowData(node, firstColumn);

    flatData.push(node.rowData);

    if (!node.collapsed) {
        if (node.children.length > 0)
            _rasterizeChildren(flatData, options);
        else
            _rasterizeDetailRows(node, flatData, selectedDetailRows);
    }

    return flatData;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _rasterizeChildren(flatData, options) {
    var node = options.node, firstColumn = options.firstColumn;
    var i, j, intermediateResult;
    for (i = 0; i < node.children.length; i++) {
        intermediateResult = rasterizeTree({node: node.children[i], firstColumn: firstColumn, selectedDetailRows: options.selectedDetailRows});
        for (j = 0; j < intermediateResult.length; j++)
            flatData.push(intermediateResult[j]);
    }
}

function _rasterizeDetailRows(node, flatData, selectedDetailRows) {
    for (var i = 0; i < node.ultimateChildren.length; i++) {
        var detailRow = node.ultimateChildren[i];
        detailRow.sectorPath = node.rowData.sectorPath;
        detailRow.isDetail = true;
        // TODO trigger selection attr
        flatData.push(detailRow);
    }
}

/**
 * enhances the `rowData` attribute of the give node with info
 * that will be useful for rendering/interactivity such as sectorPath
 */
function _decorateRowData(node, firstColumn) {
    node.rowData.sectorPath = node.getSectorPath();
    node.rowData[firstColumn.colTag] = node.sectorTitle;
    node.rowData.treeNode = node;
    return node;
}