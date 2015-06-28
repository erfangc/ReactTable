/**
 * Transform the current props into a tree structure representing the complex state
 * @param tableProps
 * @return the root TreeNode element of the tree with aggregation
 */
function createTree(tableProps) {
    // If the rootNode is passed as a prop - that means the tree is pre-configured
    if (tableProps.rootNode != null) {
        return tableProps.rootNode
    }
    // If the data is formatted as an array of arrays instead of array of objects
    if( tableProps.data.length > 0 && Array.isArray(tableProps.data[0]) ){
        for( var i=0; i<tableProps.data.length; i++ ){
            var newDataObj = {};
            for( var j=0; j<tableProps.columnDefs.length; j++ ){
                newDataObj[tableProps.columnDefs[j].colTag] = tableProps.data[i][j];
            }
            tableProps.data[i] = newDataObj;
        }
    }
    var rootNode = buildTreeSkeleton(tableProps);
    recursivelyAggregateNodes(rootNode, tableProps);
    rootNode.sortRecursivelyBySortIndex();
    rootNode.foldSubTree();
    return rootNode;
}

/**
 * Creates the data tree backed by props.data and grouped columns specified in groupBy
 * @param tableProps
 * @return {TreeNode} the root node
 */
function buildTreeSkeleton(tableProps) {
    var rootNode = new TreeNode("Grand Total", null), rawData = tableProps.data, i;
    if (tableProps.disableGrandTotal)
        rootNode.display = false
    for (i = 0; i < rawData.length; i++) {
        rootNode.appendUltimateChild(rawData[i]);
        populateChildNodesForRow(rootNode, rawData[i], tableProps.groupBy);
    }
    return rootNode
}

/**
 * Populate an existing skeleton (represented by the root node) with summary level data
 * @param node
 * @param tableProps
 */
function recursivelyAggregateNodes(node, tableProps) {
    // aggregate the current node
    node.rowData = aggregateSector(node.ultimateChildren, tableProps.columnDefs, tableProps.groupBy);

    // for each child - aggregate those as well
    if (node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++)
            recursivelyAggregateNodes(node.children[i], tableProps);
    }
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function populateChildNodesForRow(rootNode, row, groupBy) {
    var i, currentNode = rootNode;
    if (groupBy == null || groupBy.length == 0)
        return;
    for (i = 0; i < groupBy.length; i++) {
        var result = getSectorName(row, groupBy[i]);
        currentNode = currentNode.appendRowToChildren({
            childSectorName: result.sectorName,
            childRow: row,
            sortIndex: result.sortIndex,
            groupByColumnDef: groupBy[i]
        });
    }
}
