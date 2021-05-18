define([
    "base/js/namespace",
    "notebook/js/cell",
    "codemirror/lib/codemirror",
    "codemirror/keymap/vim",
    "codemirror/addon/dialog/dialog",
    "codemirror/addon/display/rulers",
    'codemirror/addon/edit/trailingspace'
], function(
    Jupyter,
    Cell,
    CodeMirror
) {
    "use_strict";

    var ruler = {
        color: "#C8C8C8",
        column: 80,
        lineStyle: "dotted"
    };

    function leave_current_mode(cm) {
        if (cm.state.vim.insertMode) {
            CodeMirror.keyMap["vim-insert"].call("Esc", cm);
        } else if (cm.state.vim.visualMode) {
            CodeMirror.keyMap["vim"].call("Esc", cm);
        } else {
            Jupyter.notebook.command_mode();
            Jupyter.notebook.focus_cell();
        }
    };

    function select_cell_below(cm) {
        Jupyter.notebook.select_next();
        Jupyter.notebook.edit_mode();
    };

    function select_cell_above(cm) {
        Jupyter.notebook.select_prev();
        Jupyter.notebook.edit_mode();
    };

    function showRelativeLines(cm) {
        // https://github.com/codemirror/CodeMirror/issues/4116#issuecomment-426877029
        const lineNum = cm.getCursor().line + 1;
        if (cm.state.curLineNum === lineNum) {
            return;
        }
        cm.state.curLineNum = lineNum;
        cm.setOption('lineNumberFormatter', l =>
            l === lineNum ? (">" + lineNum) : Math.abs(lineNum - l)
        );
    };

    function openDialog_keymap_wrapper(target, template, callback, options) {
        // Disables jupyter keyboard bindings before entering command mode `:`.
        // Otherwise, searching `/` for `a` will open a new cell above, for example.
        Jupyter.keyboard_manager.disable();
        return target.call(this, template, callback, options);
    };
    CodeMirror.defineExtension("openDialog", _.wrap(CodeMirror.prototype.openDialog, openDialog_keymap_wrapper));

    CodeMirror.Vim.map("jk", "<Esc>", "insert");

    // Update options for *existing* cells
    function update_cm_instance_to_defaults(cell) {
        var cm = cell.code_mirror;
        cm.setOption("vimMode", true);
        cm.setOption("keyMap", "vim");
        cm.setOption("rulers", [ruler]);
        cm.setOption('showTrailingSpace', true);
        cm.setOption("extraKeys",
            {
                // Need to be able to escape from "vim mode" to "jupyter mode"
                'Esc': leave_current_mode,

                // Convenience: similar to switching panes in tmux.
                'Ctrl-K': select_cell_above,
                'Ctrl-J': select_cell_below,

                // Restore other jupyter-default options that disappear because we turned on vim
                // See more at: https://github.com/jupyter/notebook/blob/2cfff07a39fa486a3f05c26b400fa26e1802a053/notebook/static/edit/js/editor.js#L91
                'Ctrl-/': 'toggleComment'
            });
        cm.on('cursorActivity', showRelativeLines);
        };
    Jupyter.notebook.get_cells().map(update_cm_instance_to_defaults);

    // Update options for *new* cells
    var cm_default = Cell.Cell.options_default.cm_config;
    cm_default.keyMap = "vim";
    cm_default.vimMode = true;
    cm_default.rulers = [ruler];
    cm_default.showTrailingSpace = true;
    Jupyter.notebook.events.on('create.Cell', function(evt, data) {
        // Jupyter frontend hooks can be found by searching the [notebook
        // repo](github.com/jupyter/notebook) for "events.trigger".
        // Reference: https://github.com/jupyter/notebook/issues/2321#issuecomment-288365064
        data.cell.code_mirror.on('cursorActivity', showRelativeLines);
    });

});
