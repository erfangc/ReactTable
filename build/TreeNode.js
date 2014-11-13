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
    this.collapsed = false;
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
TreeNode.prototype.appendRowToChildren = function (childSectorName, childRow) {
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new TreeNode(childSectorName, this);
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

TreeNode.prototype.sortChildren = function (sortFn, recursive) {
    this.children.sort(function (a, b) {
        var aRow = a.rowData, bRow = b.rowData;
        return sortFn.call(this, aRow, bRow);
    });
    // sort ultimate children if there are no children
    if (this.children.length == 0) {
        this.ultimateChildren.sort(function (a, b) {
            return sortFn.call(this, a, b);
        });
    }
    if (recursive) {
        for (var i = 0; i < this.children.length; i++)
            this.children[i].sortChildren(sortFn, recursive);
    }
}
