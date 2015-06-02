/**
 * Represents a grouping of table rows with references to children that are also grouping
 * of rows
 * @constructor
 */
function TreeNode(sectorTitle, parent) {
    // accessible properties
    this.sectorTitle = sectorTitle;
    this.parent = parent;
    this.groupByColumnDef = {};
    this.rowData = null;
    this.display = true;
    this.children = [];
    this.ultimateChildren = [];
    this.collapsed = this.parent != null;
    this.sortIndex = null;
    this.hiddenByFilter = false;
    // private members
    this._childrenSectorNameMap = {}
}

TreeNode.prototype.appendUltimateChild = function (row) {
    this.ultimateChildren.push(row)
}

TreeNode.prototype.collapseImmediateChildren = function () {
    for (var i = 0; i < this.children.length; i++)
        this.children[i].collapsed = true;
}

TreeNode.prototype.foldSubTree = function () {
    for (var i = 0; i < this.children.length; i++) {
        if (!this.children[i].hasChild())
            this.children[i].collapsed = true;
        else
            this.children[i].collapsed = false;
        this.children[i].foldSubTree();
    }
};

TreeNode.prototype.hasChild = function () {
    return (this.children.length > 0);
};

TreeNode.prototype.expandRecursively = function () {
    var i;
    for (i = 0; i < this.children.length; i++) {
        this.children[i].collapsed = false;
        this.children[i].expandRecursively();
    }
};

/**
 * Appends the given row into the ultimateChildren of the specified child node of the current node
 * @param childSectorName
 * @param childRow
 * @returns the child TreeNode that the data was appended to
 */
TreeNode.prototype.appendRowToChildren = function (options) {
    var childSectorName = options.childSectorName, childRow = options.childRow, sortIndex = options.sortIndex, groupByColumnDef = options.groupByColumnDef;
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new TreeNode(childSectorName, this);
        child.sortIndex = sortIndex;
        child.groupByColumnDef = groupByColumnDef;
        this.children.push(child);
        this._childrenSectorNameMap[childSectorName] = child;
    }
    if (childRow)
        this._childrenSectorNameMap[childSectorName].appendUltimateChild(childRow);
    return this._childrenSectorNameMap[childSectorName];
};

TreeNode.prototype.getSectorPath = function () {
    var result = [this.sectorTitle], prevParent = this.parent;
    while (prevParent != null) {
        result.unshift(prevParent.sectorTitle);
        prevParent = prevParent.parent;
    }
    return result;
};

TreeNode.prototype.sortChildren = function (options) {
    var sortFn = options.sortFn, reverseSortFn = options.reverseSortFn,
        recursive = options.recursive, sortAsc = options.sortAsc;

    var multiplier = sortAsc == true ? 1 : -1;
    this.children.sort(function (a, b) {
        var aRow = a.rowData, bRow = b.rowData;
        if( !reverseSortFn || multiplier === 1 )
            return multiplier * sortFn(aRow, bRow);
        else
            return reverseSortFn(aRow, bRow);
    });
    if (!this.hasChild())
        this.ultimateChildren.sort(function (a, b) {
            if( !reverseSortFn || multiplier === 1 )
                return multiplier * sortFn(a, b);
            else
                return reverseSortFn(a, b);
        });

    if (recursive) {
        for (var i = 0; i < this.children.length; i++)
            this.children[i].sortChildren({sortFn: sortFn, reverseSortFn: options.reverseSortFn,
                                            recursive: recursive, sortAsc: sortAsc});
    }
};

TreeNode.prototype.addSortToChildren = function (options) {
    var sortFn = options.sortFn, reverseSortFn = options.reverseSortFn,
        oldSortFns = options.oldSortFns,
        recursive = options.recursive, sortAsc = options.sortAsc;

    var multiplier = sortAsc == true ? 1 : -1;
    var childrenToAddSort = [];

    for( var i=0; i+1<this.children.length; i++ ){
        transformSortCandidates(this.children, i, true, i+2>=this.children.length);
    }

    if( !this.hasChild() ) {
        for (var i = 0; i + 1 < this.ultimateChildren.length; i++) {
            transformSortCandidates(this.ultimateChildren, i, false, i+2>=this.ultimateChildren.length);
        }
    }

    if (recursive) {
        for (var i = 0; i < this.children.length; i++)
            this.children[i].addSortToChildren(options);
    }

    function transformSortCandidates(nodes, i, isChild, lastElement){
        if( childrenToAddSort.length == 0 )
            childrenToAddSort.push( $.extend( {}, nodes[i] ) );

        var tieFound = true;
        for( var j=0; j<oldSortFns.length; j++ ){
            if( oldSortFns[j](extractData(nodes[i], isChild), extractData(nodes[i+1], isChild)) !== 0 ){
                tieFound = false;
                break;
            }
        }
        if( tieFound && !lastElement ){
            childrenToAddSort.push( $.extend( {}, nodes[i+1] ) );
        }
        else if( childrenToAddSort.length > 1 ){
            if( lastElement )
                childrenToAddSort.push( $.extend( {}, nodes[i+1] ) );
            // Sort next level
            childrenToAddSort.sort(function (a, b) {
                if( !reverseSortFn || multiplier === 1 )
                    return multiplier * sortFn(extractData(a, isChild), extractData(b, isChild));
                else
                    return reverseSortFn(extractData(a, isChild), extractData(b, isChild));
            });
            // Replace ultimate children with correct next level of sorting
            for( var ii=0; ii<childrenToAddSort.length; ii++ ){
                var childIndexToReplace = i + ii + 1 - (childrenToAddSort.length);
                nodes[childIndexToReplace] = childrenToAddSort[ii];
            }
            childrenToAddSort = [];
        }
        else{
            childrenToAddSort = [];
        }
    }

    function extractData(obj, isChild){
        return isChild ? obj.rowData : obj;
    }
};

TreeNode.prototype.filterByColumn = function(columnDef, textToFilterBy){
    // Filter aggregations?
    for( var i=0; i<this.children.length; i++ ){
        // Call recursively to filter leaf nodes first
        this.children[i].filterByColumn(columnDef,textToFilterBy);
        // Check to see if all children are hidden, then hide parent if so
        var allChildrenHidden = true;
        for( var j=0; j<this.children[i].ultimateChildren.length; j++ ){
            if( !this.children[i].ultimateChildren[j].hiddenByFilter ){
                allChildrenHidden = false;
                break;
            }
        }
        this.children[i].hiddenByFilter = allChildrenHidden;
    }
    if( !this.hasChild() ) {
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            this.ultimateChildren[i].hiddenByFilter = this.ultimateChildren[i][columnDef.colTag].search(textToFilterBy) === -1;
        }
    }
};

TreeNode.prototype.sortRecursivelyBySortIndex = function () {
    // test if children have sortIndex - if not skip sorting children
    if (this.hasChild() && _hasSortIndex(this.children[0])) {
        this.children.sort(function (a, b) {
            if (_hasSortIndex(a) && _hasSortIndex(b))
                return a.sortIndex - b.sortIndex;
            return 0;
        });
    }
    // sort children's children
    for (var i = 0; i < this.children.length; i++)
        this.children[i].sortRecursivelyBySortIndex();
};

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _hasSortIndex(node) {
    return (node != null && node.sortIndex != null && !isNaN(node.sortIndex))
}