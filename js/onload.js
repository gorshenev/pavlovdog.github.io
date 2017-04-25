var range = (start, end) => [...Array(end - start + 1)].map((_, i) => start + i);

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    console.log("Web3 detected!");
    window.web3 = new Web3(web3.currentProvider);
    // Now you can start your app & access web3 freely:
    startApp();
  }
})
