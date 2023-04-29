//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const lodash = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// connect to database
// mongoose.connect('mongodb://127.0.0.1:27017/todolistDB');
mongoose.connect('mongodb+srv://TinyPlanet:6dnuObGs4NF7ivJ6@cluster0.ywwobi6.mongodb.net/todolistDB');

// create itemSchema
const itemSchema = new mongoose.Schema ({
  name: {
    type: String,
    required: [true, "please check data entry"]
  }
})
// create new mongoose model: name + schema
const Item = mongoose.model("Item", itemSchema);

const eat = new Item({
  name: "Eat"
});

const walk = new Item({
  name: "Walk"
});

const sleep = new Item({
  name: "Sleep"
});

const defaultItems = [eat, walk, sleep];

// each /work, /relax has its own list of items
const listSchema = {
  name: String,
  items: [itemSchema]
}
const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {
  Item.find({}).exec().then((items, err)=>{
    if (items.length === 0){
      Item.insertMany(defaultItems).then(()=>{
        console.log("Default items inserted")
      }).catch((error)=>{
        console.log(error)
      });
      // !! if added, redirect back into root route and refresh
      res.redirect("/"); 
    }
    if (err) {console.log(err);}
    else {
      // const itemsNames = items.map(i => i.name);
      res.render("list", {listTitle: "Today", newListItems: items});
    }
  })
});

app.get("/:customListName", (req, res)=>{
  // only capitalize the first letter
  const customListName = lodash.capitalize(req.params.customListName);
  // create new default list of Item for /work, /relax, ....
  List.findOne({name: customListName}).then((results, err)=>{
    if (err) {console.log(err);}
    else {
      if (!results){
        // if the list with same name of /... doesn't exist, create new list
        const list = new List({
          name: customListName,
          items: defaultItems
        })
        list.save();
        res.redirect("/"+customListName);
      } else {
        // show existing list
        res.render("list",{listTitle: results.name, newListItems: results.items})
      }
    }
  })
})

app.post("/", function(req, res){
  const itemName = req.body.newItem;
  const listName = req.body.list; // the name of the submit button is list
  const item = new Item({
    name: itemName
  });
  // !!!
  if (listName === "Today"){
    // item added in the home list. redirect to home
    item.save();
    res.redirect("/");
  } else {
    // item added in custom list.
    // search for that list document in database
    // add the item to the existing array in that list document
    // redirect to the listName route
    List.findOne({name: listName}).then((foundList, err)=>{
      if (err) {console.log(err);}
      else {
        foundList.items.push(item);
        foundList.save();
        res.redirect("/"+listName);
      }
    })
  }
  // do not save the same list twice here!! parallel error
});

// click checkbox to delete item
app.post("/delete",(req,res)=>{
  // get id of checked item by its checkbox's value
  const checkedItemID = req.body.checkbox;
  // need to check the list the checkbox is from, and delete from correct list

  const listName = req.body.listName;

  if (listName === "Today"){
    // on the default home list
    Item.findByIdAndDelete(checkedItemID).then((docs, err)=>{
      if (err) {console.log(err);} 
      else {
        console.log("Deleted: " + docs);
      };
    })
    res.redirect("/");
  } else {
    // find the list document that has the current listName
    // update the list to remove the checked item with that id
    // use mongodb: $pull
    List.findOneAndUpdate({name: listName}, 
      {$pull:{items:{_id: checkedItemID}}}).then((foundList, err)=>{
        if (!err){res.redirect("/"+listName);}
    });
  }

  
})

app.get("/work", function(req,res){
  res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function(req, res){
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});
