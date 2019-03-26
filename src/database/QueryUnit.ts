"use strict";
import * as vscode from "vscode";
import { IConnection } from "../model/connection";
import { AppInsightsClient } from "../common/appInsightsClient";
import { OutputChannel } from "../common/outputChannel";
import { SqlViewManager } from "./SqlViewManager";
import { ConnectionManager } from "./ConnectionManager";

export class QueryUnit {
    public static readonly maxTableCount = QueryUnit.getConfiguration().get<number>("maxTableCount");

    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("vscode-mysql");
    }

    public static queryPromise<T>(connection, sql: string): Promise<T> {
        return new Promise((resolve, reject) => {
            OutputChannel.appendLine(`Execute SQL:${sql}`)
            connection.query(sql, (err, rows) => {
                if (err) {
                    OutputChannel.appendLine(err)
                    reject("Error: " + err.message);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    public static async runQuery(sql?: string, connectionOptions?: IConnection) {
        AppInsightsClient.sendEvent("runQuery.start");
        if (!sql && !vscode.window.activeTextEditor) {
            vscode.window.showWarningMessage("No SQL file selected");
            AppInsightsClient.sendEvent("runQuery.noFile");
            return;
        }
        let connection:any;
        if (!connectionOptions && !(connection = await ConnectionManager.getLastActiveConnection())) {
            vscode.window.showWarningMessage("No MySQL Server or Database selected");
            AppInsightsClient.sendEvent("runQuery.noMySQL");
            return;
        } else {
            connectionOptions.multipleStatements = true;
            connection =await ConnectionManager.getConnection(connectionOptions)
        }

        if (!sql) {
            const activeTextEditor = vscode.window.activeTextEditor;
            const selection = activeTextEditor.selection;
            if (selection.isEmpty) {
                sql = activeTextEditor.document.getText();
            } else {
                sql = activeTextEditor.document.getText(selection);
            }
        }

        connection.query(sql, (err, rows) => {
            if (Array.isArray(rows)) {
                if (rows.some(((row) => Array.isArray(row)))) {
                    rows.forEach((row, index) => {
                        if (Array.isArray(row)) {
                            SqlViewManager.showQueryResult(row, '');
                        } else {
                            OutputChannel.appendLine(JSON.stringify(row));
                        }
                    });
                } else {
                    SqlViewManager.showQueryResult(rows, '');
                }

            } else {
                OutputChannel.appendLine(JSON.stringify(rows));
            }

            if (err) {
                OutputChannel.appendLine(err);
                AppInsightsClient.sendEvent("runQuery.end", { Result: "Fail", ErrorMessage: err });
            } else {
                AppInsightsClient.sendEvent("runQuery.end", { Result: "Success" });
            }
        });
    }

    public static async createSQLTextDocument(sql: string = "") {
        const textDocument = await vscode.workspace.openTextDocument({ content: sql, language: "sql" });
        return vscode.window.showTextDocument(textDocument);
    }

}
