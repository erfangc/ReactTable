$(function () {
    $.get('OBSID.MOBILE_TAGS_SECT.iBARC.json').success(function (json) {
        var rootNode = ConvertToReactTableTree(json)
        var columnDefs = json.TITLES.map(function (r) {
            return {colTag: r, text: r}
        })
        var table1 = React.render(React.createElement(ReactTable, {height: "600px",rootNode: rootNode, data: [], columnDefs: columnDefs}), document.getElementById("table"));
    })
})

function ConvertToReactTableTree(json) {
    var colTags = json.TITLES
    var rootNode = new TreeNode("ROOT", null);
    rootNode.display = false
    rootNode.rowData = {};
    populateChildren({node: rootNode, json: json, colTags: json.TITLES})
    return rootNode
}

function populateChildren(options) {
    var node = options.node, json = options.json, colTags = options.colTags
    for (var i = 0; i < json.CHILDREN.length; i++) {
        var child = json.CHILDREN[i]
        var rowData = generateRowData(colTags, child.VALUES)
        if (child.CHILDREN.length > 0 || node.sectorTitle === "ROOT") {
            var childNode = node.appendRowToChildren({
                childSectorName: child.SECTOR_TAG
            })
            childNode.rowData = rowData
            populateChildren({node: childNode, json: child, colTags: colTags})
        } else
            node.appendUltimateChild(rowData)

    }
}

function generateRowData(colTags, rowData) {
    var result = {}
    for (var i = 0; i < colTags.length; i++) {
        var colTag = colTags[i];
        result[colTag] = rowData[i]
    }
    return result
}
