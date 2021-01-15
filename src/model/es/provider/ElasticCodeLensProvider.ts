import * as vscode from 'vscode';
import { DocumentFinder } from './documentFinder';
import { ElasticDecoration } from './ElasticDecoration'
import { ElasticMatches } from './ElasticMatches'

export class ElasticCodeLensProvider implements vscode.CodeLensProvider {
    private decoration: ElasticDecoration;
    public constructor(context: vscode.ExtensionContext) {
        this.decoration = new ElasticDecoration(context)
    }

    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken) {

        var esMatches = new ElasticMatches(vscode.window.activeTextEditor)
        this.decoration.UpdateDecoration(esMatches)

        var ret = [];

        esMatches.Matches.forEach(em => {
            if (em.Error.Text == null) {
                ret.push(new vscode.CodeLens(em.Method.Range, {
                    title: "▶ Run Query",
                    command: "mysql.elastic.execute",
                    arguments: [em]
                }))
                if(DocumentFinder.find(em.Path.Text)){
                    ret.push(new vscode.CodeLens(em.Method.Range, {
                        title: "📃 Api Document",
                        command: "mysql.elastic.document",
                        arguments: [em]
                    }))
                }
                if (em.HasBody) {
                    var command = {
                        title: "⚡Auto indent",
                        command: "mysql.elastic.lint",
                        arguments: [em]
                    }
                    ret.push(new vscode.CodeLens(em.Method.Range, command))
                }
            }
            else {
                if (em.Error.Text != null) {
                    ret.push(new vscode.CodeLens(em.Method.Range, {
                        title: "⚠️Invalid Json",
                        command: ""
                    }))
                }
            }
        });
        return ret;
    }
}