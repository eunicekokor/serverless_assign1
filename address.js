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
            createAddress(event, theCallback, callback);
            break;
        case 'read':
            getAddress(event, theCallback, callback);
            break;
        case 'update':
            updateAddress(event, theCallback, callback);
            break;
        case 'delete':
            deleteAddress(event, theCallback, callback);
            break;
        default:
            callback(new Error(`Unrecognized operation "${event.operation}"`));
    }

    function getAddress(event, callback1, callback2){
        // we get addresses by the UUID
        var params = {
            TableName: 'Address', /*Make sure this matches our DynamoDB tablename*/
            Key: {"UUID" : event.UUID}

        };

        console.log("In getAddress, params = " + JSON.stringify(params));

        dynamo.getItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));
                callback1(err, null, callback2);

            } else {
                console.log("Get address success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });
    }

    function deleteAddress(event, callback1, callback2){
        // we specify that the address isn't already in our db before we delete it
        // we also require the UUID and the city
        var params = {
            TableName: 'Address', /*Make sure this matches our DynamoDB tablename*/
            Key: {"UUID" : event.UUID},
            ConditionExpression: "attribute_exists(#id)",
            ReturnValues: "ALL_OLD"
        };

        console.log("In deleteAddress, params = " + JSON.stringify(params));

        dynamo.deleteItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));
                callback1(err, null, callback2);

            } else {
                console.log("Delete address success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });
    }

    function createAddress(event, callback1, callback2){
        // we specify that the address isn't already in our db before we create it
        var params = {
            TableName: 'Address', /*Make sure this matches our DynamoDB tablename*/
            Item: event.item,
            ExpressionAttributeNames: {"#id": "UUID"},
            "ConditionExpression": "attribute_not_exists(city) and attribute_not_exists(#id)"
        }

        console.log(params);

        if (params.Item) {

            if (params.Item.zip_code.length != 5){
                callback1("Not a valid zip code", null, callback2);
            }

        }

        console.log("In createAddress, params = " + JSON.stringify(params));

        dynamo.putItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));

                callback1(err, null, callback2);
            } else {
                console.log("Put address success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });
    }

    function updateAddress(event, callback1, callback2){

        // Using http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html for reference
        // as well as http://docs.aws.amazon.com/amazondynamodb/latest/gettingstartedguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03 for a Javascript guide
        // This function below programmatically figures out what changes to address the request made in the event
        // the result will be formatted strings needed for the "ExpressionAttributeValues" and "UpdateExpression"
        // also makes sure the address exists before putting
        var possible_changes = [ "city", "street", "zip_code", "number"];
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

        // makes sure that it only updates if that address is in the DB
        var params = {
            TableName:'Address',
            Key: {"UUID": event.item.UUID},
            ExpressionAttributeValues: expressionAttVals,
            ExpressionAttributeNames: {"#id": "UUID"},
            ConditionExpression: "attribute_exists(#id)",
            UpdateExpression: updateEx,
            ReturnValues:"ALL_OLD"
        };


         dynamo.updateItem(params, function(err, data) {
            if (err){
                console.log("Error = "+ JSON.stringify(err));
                callback1(err, null, callback2);
            } else {
                console.log("Put address success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);
            }
        });

    }


};
