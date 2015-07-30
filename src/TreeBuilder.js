/**
 * Transform the current props into a tree structure representing the complex state
 * @param props
 * @return {TreeNode}
 */
function createNewRootNode(props, state) {
    var start = new Date().getTime();
    var rootNode = buildTreeSkeleton(props, state);
    recursivelyAggregateNodes(rootNode, state);

    rootNode.sortRecursivelyBySortIndex();
    rootNode.foldSubTree();

    console.log("create new tree: " + (new Date().getTime() - start));
    return rootNode;
}

/**
 * adding new subtotalBy, only create the deepest level subtree
 * @param lrootNode
 * @param newSubtotal
 * @param state
 */
function buildSubtree(lrootNode, newSubtotal, state) {
    if (lrootNode.children.length == 0 || (lrootNode.children.children && lrootNode.children.children.length == 0)) {
        //find the leaf node
        for (var j = 0; j < lrootNode.ultimateChildren.length; j++) {
            //build subtree
            populateChildNodesForRow(lrootNode, lrootNode.ultimateChildren[j], newSubtotal);
        }
        for (var key in lrootNode._childrenSectorNameMap) {
            //generate subtree's aggregation info
            var node = lrootNode._childrenSectorNameMap[key];
            node.rowData = aggregateSector(node.ultimateChildren, state.columnDefs, newSubtotal);
        }
    } else {
        for (var i = 0; i < lrootNode.children.length; i++) {
            buildSubtree(lrootNode.children[i], newSubtotal, state);
        }
    }
}

/**
 * add a new subtotalBy, build subtrees in leaf nodes
 * @param state
 * @returns {*}
 */
function buildSubtreeForNewSubtotal(state) {
    var start = new Date().getTime();

    var newSubtotal = [state.subtotalBy[state.subtotalBy.length - 1]];
    buildSubtree(state.rootNode, newSubtotal, state);
    state.rootNode.sortRecursivelyBySortIndex();
    state.rootNode.foldSubTree();

    console.log("build Subtree: " + (new Date().getTime() - start));
    return state.rootNode;
}

/**
 * destory all subtree in root
 * @param lroot
 */
function destorySubtreesRecursively(lroot) {
    if (lroot.children.length == 0) {
        return;
    }

    for (var i = 0; i < lroot.children.length; i++) {
        destorySubtreesRecursively(lroot.children[i]);
        lroot.children[i] = null;
    }
    lroot.children = [];
    lroot._childrenSectorNameMap = {};
}

/**
 * destory root's children
 * @param state
 */
function destoryRootChildren(state) {
    for (var i = 0; i < state.rootNode.children.length; i++) {
        state.rootNode.children[i] = null;
    }
    state.rootNode.children = [];
    state.rootNode._childrenSectorNameMap = {};
}

/**
 * destory root's subtrees to clear subtotals
 * @param state
 */
function destorySubtrees(state) {
    var start = new Date().getTime();
    destorySubtreesRecursively(state.rootNode);
    console.log("destory subtree: " + (new Date().getTime() - start));
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
        rootNode.display = false;
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
// can postpone generate lower level aggregation information to accelerate initial render
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
    // currentNode is the deepest level non leaf children
    return currentNode;
}
