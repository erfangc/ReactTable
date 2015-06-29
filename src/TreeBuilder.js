/**
 * Transform the current props into a tree structure representing the complex state
 * @param props
 * @return {TreeNode}
 */
function createNewRootNode(props, state) {

    var rootNode = buildTreeSkeleton(props, state);
    recursivelyAggregateNodes(rootNode, state);

    rootNode.sortRecursivelyBySortIndex();
    rootNode.foldSubTree();

    return rootNode;
}

/**
 * Creates the TreeNode structure backed by props.data and grouped by columns specified in subtotalBy
 * @param props
 * @param state
 * @return {TreeNode} the root node
 */
function buildTreeSkeleton(props, state) {
    var rootNode = new TreeNode("Grand Total", null), rawData = props.data, i;
    if (props.disableGrandTotal)
        rootNode.display = false
    for (i = 0; i < rawData.length; i++) {
        rootNode.appendUltimateChild(rawData[i]);
        populateChildNodesForRow(rootNode, rawData[i], state.subtotalBy);
    }
    return rootNode
}

/**
 * Populate an existing skeleton (represented by the root node) with summary level data
 * @param node
 * @param tableProps
 */
function recursivelyAggregateNodes(node, state) {
    // aggregate the current node
    node.rowData = aggregateSector(node.ultimateChildren, state.columnDefs, state.subtotalBy);

    // for each child - aggregate those as well
    if (node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++)
            recursivelyAggregateNodes(node.children[i], state);
    }
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function populateChildNodesForRow(rootNode, row, subtotalBy) {
    var i, currentNode = rootNode;
    if (subtotalBy == null || subtotalBy.length == 0)
        return;
    for (i = 0; i < subtotalBy.length; i++) {
        var result = getSectorName(row, subtotalBy[i]);
        currentNode = currentNode.appendRowToChildren({
            childSectorName: result.sectorName,
            childRow: row,
            sortIndex: result.sortIndex,
            subtotalByColumnDef: subtotalBy[i]
        });
    }
}
