/**
 * export tree structure to flat data
 * @param options
 * @param hasSubtotalBy
 * @returns {Array}
 */
//function exportTreeData(options, hasSubtotalBy) {
//    var node = options.node, firstColumn = options.firstColumn;
//
//    node = _decorateRowData(node, firstColumn, hasSubtotalBy);
//    var flatData = node.display == false ? [] : [node.rowData];
//
//    if (node.children.length > 0)
//        _rasterizeChildren(flatData, options, hasSubtotalBy);
//    else
//        _rasterizeDetailRows(node, flatData);
//
//    return flatData;
//}

/**
 * Converts the table state from a tree format to a array of rows for rendering
 * @param rootNode
 * @return {Array}
 */
function rasterizeTree(options, hasSubtotalBy,exportAll) {
    var node = options.node, firstColumn = options.firstColumn;

    node = _decorateRowData(node, firstColumn, hasSubtotalBy);
    var flatData = node.display == false ? [] : [node.rowData];

    if(exportAll){
        if (node.children.length > 0)
            _rasterizeChildren(flatData, options, hasSubtotalBy,exportAll);
        else
            _rasterizeDetailRows(node, flatData);
    }
    else if (!node.collapsed) {
        if (node.children.length > 0)
            _rasterizeChildren(flatData, options, hasSubtotalBy,exportAll);
        else
            _rasterizeDetailRows(node, flatData);
    }

    return flatData;
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _rasterizeChildren(flatData, options, hasSubtotalBy,exportAll) {
    var node = options.node, firstColumn = options.firstColumn;
    var i, j, intermediateResult;
    for (i = 0; i < node.children.length; i++) {
        intermediateResult = rasterizeTree({node: node.children[i], firstColumn: firstColumn}, hasSubtotalBy,exportAll);
        for (j = 0; j < intermediateResult.length; j++) {
            if (!(intermediateResult[j].treeNode && intermediateResult[j].treeNode.hiddenByFilter))
                flatData.push(intermediateResult[j]);
        }
    }
}

function _rasterizeDetailRows(node, flatData) {
    for (var i = 0; i < node.ultimateChildren.length; i++) {
        var detailRow = node.ultimateChildren[i];
        if (!detailRow.hiddenByFilter) {
            detailRow.sectorPath = node.rowData.sectorPath;
            detailRow.isDetail = true;
            flatData.push(detailRow);
        }
    }
}

/**
 * enhances the `rowData` attribute of the give node with info
 * that will be useful for rendering/interactivity such as sectorPath
 */
function _decorateRowData(node, firstColumn, hasSubtotalBy) {
    node.rowData.sectorPath = node.getSectorPath();
    if (hasSubtotalBy) {
        node.rowData[firstColumn.colTag] = node.sectorTitle;
    }
    //why rowData need refer to tree node itself?
    node.rowData.treeNode = node;
    return node;
}