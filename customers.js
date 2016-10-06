'use strict';

console.log('Loading function');

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();


function theCallback(err, data, callback) {
    console.log("getCustomer: Before callback");

    if (data){
        //callback(null, JSON.stringify(data));
        callback(null, data);
        console.log("theCallback:   data = " + JSON.stringify(data));
    }

    if (err) {
        callback(err, null);
        console.log("theCallback: failure = " + JSON.stringify(err));
    }
}

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    console.log("In handler");
    console.log("handler: event = " + JSON.stringify(event));
    console.log("handler: context = " + JSON.stringify(context));

    var operation = event.operation;

    switch (operation) {
        case 'create':
            createCustomer(event, theCallback, callback);
            break;
        case 'read':
            getCustomer(event, theCallback, callback);
            break;
        case 'update':
            updateCustomer(event, theCallback, callback);
            break;
        case 'delete':
            deleteCustomer(event, theCallback, callback);
            break;
        case 'echo':
            callback(null, event);
            break;
        case 'ping':
            callback(null, 'pong');
            break;
        default:
            callback(new Error(`Unrecognized operation "${event.operation}"`));
    }

    function getCustomer(event, callback1, callback2){

      //get customer by their email
        var params = {
            TableName: 'Customer', /*Make sure this matches our DynamoDB tablename*/
            Key: {"email": event.email}
        };

        console.log("In getCustomer, params = " + JSON.stringify(params));

        dynamo.getItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));
                callback1(err, null, callback2);

            } else {
                console.log("Get customer success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });
    }

    function createCustomer(event, callback1, callback2){
        // create only if email doesn't already exist
        var params = {
            TableName: 'Customer', /*Make sure this matches our DynamoDB tablename*/
            Item: event.item,
            ConditionExpression: 'attribute_not_exists(email)'
        };

        console.log("In createCustomer, params = " + JSON.stringify(params));

        // VALIDATION: Check if the email has a "@" & ".com"
        // Make sure there is a firstname
        // Make sure there is a lastname

        if (!params.Item.email.includes("@") || !params.Item.email.includes(".")) {
            console.log("Validation Error: Email not formatted correctly. Needs @ and .[domain]");
            callback1("Validation Error: Email not formatted correctly. Needs @ and .[domain]", null, callback2);
        }

        if (params.Item.firstname === "" || params.Item.lastname === "" || params.Item.email === ""){
            console.log("Null Value Error: One or more fields are null");
            callback1("Null Value Error: One or more fields are null", null, callback2);
        }


        dynamo.putItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));
                callback1(err, null, callback2);
            } else {
                console.log("Put customer success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });
    }

    function deleteCustomer(event, callback1, callback2){
        // delete only if it exists
        var params = {
            TableName: 'Customer', /*Make sure this matches our DynamoDB tablename*/
            Key: {"email": event.email},
            ConditionExpression: 'attribute_exists(email)'
        };

        console.log("In deleteCustomer, params = " + JSON.stringify(params));

        dynamo.deleteItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));
                callback1(err, null, callback2);

            } else {
                console.log("Delete customer success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });
    }

    function updateCustomer(event, callback1, callback2){
        // This function below programmatically figures out what changes to customer the request made in the event
        // the result will be formatted strings needed for the "ExpressionAttributeValues" and "UpdateExpression"
        // also makes sure that the customer exists before putting
        var possible_changes = ["firstname", "lastname", "address_ref", "phone_number"];
        var updateEx = "SET";
        var expressionAttVals = {};

        for (var i = 0; i<possible_changes.length; i++){
            var item = possible_changes[i];
            console.log(item);
            if (event.item[item]){
                var q = ":" +item[0];
                updateEx += " " + item + " = " +q + ",";
                expressionAttVals[q] = event.item[item];
            }
        }

        updateEx = updateEx.substr(0,updateEx.length-1);
        console.log("updateEx = " + updateEx);
        console.log("expressionAttVals = " + JSON.stringify(expressionAttVals));


        var params = {
            TableName:'Customer',
            Key: {"email": event.item.email},
            ConditionExpression: "attribute_exists(email)",
            UpdateExpression: updateEx,
            ExpressionAttributeValues: expressionAttVals,
            ReturnValues:"ALL_OLD"
        };

        if (params.Key.email){
           if (!params.Key.email.includes("@") || !params.Key.email.includes(".")) {
            console.log("Validation Error: Email not formatted correctly. Needs @ and .[domain]");
            callback1("Validation Error: Email not formatted correctly. Needs @ and .[domain]", null, callback2);
            }

            if (params.Key.email === ""){
                 console.log("Null Value Error: One or more fields are null");
                 callback1("Null Value Error: One or more fields are null", null, callback2);
             }

        }

        if (params.Key.firstname){
             if (params.Key.firstname === ""){
                 console.log("Null Value Error: One or more fields are null");
                 callback1("Null Value Error: One or more fields are null", null, callback2);
             }
        }

        if (params.Key.lastname){
             if (params.Key.lastname === ""){
                 console.log("Null Value Error: One or more fields are null");
                 callback1("Null Value Error: One or more fields are null", null, callback2);
             }
        }

         dynamo.updateItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));
                callback1(err, null, callback2);
            } else {
                console.log("Put customer success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });

    }
};
