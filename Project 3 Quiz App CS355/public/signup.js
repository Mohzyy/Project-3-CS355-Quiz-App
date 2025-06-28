document.getElementById("signupBtn").addEventListener("click", async (e) => {
  e.preventDefault(); 

  const username = document.getElementById("signup-username").value.trim();
  const password = document.getElementById("signup-password").value;

  const res = await fetch("/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (res.ok) {
    alert("Signup successful!");
    window.location.href = "/login.html";
  } else {
    alert(" Signup failed: " + data.error);
  }
});
