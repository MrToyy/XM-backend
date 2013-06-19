	var Journal = Parse.Object.extend("Journals");
	
	var XMEntry = Parse.Object.extend("XMEntry",{//instance methods
		parseDescription: function(){
			var des=new string(this.get("description").length);
			if (des.length>0){
				var desArr=des.split(" ");
				if (desArr.length==1){
					if isNaN(desArr[0]){
						this.set("returnCode","200");
					}else{
						var debitJournal = new Journal();
						debitJournal.set("amount",desArr[0]);
						debitJournal.set("accountRef",searchRef("其他"));
						this.add("journals",debitJournal);
						
						var creditJournal = new Journal();
						creditJournal.set("amount",-desArr[0]);
						creditJournal.set("accountRef",searchRef("现金"));
						this.add("journals",creditJournal);
						
						debitJournal.destroy();
						creditJournal.destroy();
					}
				}else{
					for 
				}
			}else{//description为空
			
			}
		}
	},{//class methods
	
	});
	
    var XMReport = Parse.Object.extend("XMReport",{
		recordEntry: function(entry){
		
		}
	},{
	
	});