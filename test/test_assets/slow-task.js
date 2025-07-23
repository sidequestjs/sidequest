exports.run = () => {
    let wait = true;
    let startedAt = new Date();
    
    while(wait){
        if((new Date().getTime() - startedAt.getTime()) > 3000){
            wait = false;
        }
    }
    
    return "slow task executed";
}
