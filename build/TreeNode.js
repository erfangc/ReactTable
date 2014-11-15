// TODO consider if this sortIndex property thing is the best way to sort
/**
 * Represents a grouping of table rows with references to children that are also grouping
 * of rows
 * @constructor
 */
function TreeNode(sectorTitle, parent) {
    // accessible properties
    this.sectorTitle = sectorTitle;
    this.parent = parent;
    this.rowData = null;
    this.children = [];
    this.ultimateChildren = [];
    this.collapsed = this.parent != null ? true : false;
    this.sortIndex = null;
    // private members - TODO use closure to hide this
    this._childrenSectorNameMap = {};
}

TreeNode.prototype.appendRow = function (row) {
    this.ultimateChildren.push(row);
}

TreeNode.prototype.collapseImmediateChildren = function () {
    var i;
    for (i = 0; i < this.children.length; i++)
        this.children[i].collapsed = true;
}

TreeNode.prototype.expandRecursively = function () {
    var i;
    for (i = 0; i < this.children.length; i++) {
        this.children[i].collapsed = false;
        this.children[i].expandRecursively();
    }
}

/**
 * Appends the given row into the ultimateChildren of the specified child node of the current node
 * @param childSectorName
 * @param childRow
 * @returns the child TreeNode that the data was appended to
 */
TreeNode.prototype.appendRowToChildren = function (options) {
    var childSectorName = options.childSectorName, childRow = options.childRow, sortIndex = options.sortIndex;
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new TreeNode(childSectorName, this);
        child.sortIndex = sortIndex;
        this.children.push(child);
        this._childrenSectorNameMap[childSectorName] = child;
    }
    this._childrenSectorNameMap[childSectorName].appendRow(childRow);
    return this._childrenSectorNameMap[childSectorName];
}

TreeNode.prototype.getSectorPath = function () {
    var result = [this.sectorTitle], prevParent = this.parent;
    while (prevParent != null) {
        result.unshift(prevParent.sectorTitle);
        prevParent = prevParent.parent;
    }
    return result;
}

TreeNode.prototype.sortChildren = function (options) {
    var sortFn = options.sortFn, recursive = options.recursive, sortAsc = options.sortAsc,
        sortByIndex = options.sortByIndex;

    var multiplier = sortAsc == true ? 1 : -1;
    this.children.sort(function (a, b) {
        var aRow = a.rowData, bRow = b.rowData;
        // if the child.rowData contain sortIndices - sort those
        if (sortByIndex == true && _hasSortIndex(a, b))
            return a.sortIndex - b.sortIndex;
        return multiplier * sortFn(aRow, bRow);
    });
    // sort ultimate children if there are no children
    if (this.children.length == 0) {
        this.ultimateChildren.sort(function (a, b) {
            return multiplier * sortFn(a, b);
        });
    }
    if (recursive) {
        for (var i = 0; i < this.children.length; i++)
            this.children[i].sortChildren({
                sortFn: sortFn, recursive: recursive,
                sortAsc: sortAsc, sortByIndex: sortByIndex
            });
    }
}

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _hasSortIndex(a, b) {
    return (a.sortIndex != null && b.sortIndex != null && !isNaN(a.sortIndex) && !isNaN(a.sortIndex))
}