publicKey = "pk_test_c720d983a1e01efbbe84667533e75c04271c0a22";
live = "pk_live_4da031073850b87031bc9783119a7d35362cbb69";

let amount = 300000;
const urlParams = new URLSearchParams(window.location.search);
const plan = urlParams.get("plan")?.toLowerCase() || "basic";
const pls = document.getElementById("plan_show");
var sentOtp = false;
btn = document.getElementById("continueBtn");
subPlan = "Basic";
btnText = "Continue";
hasPaid = false;
let no_days_left_ = 30;
const cookieName = "hasSubscribed";
const cookieName2 = "sub_number";
const cookieName3 = "hasSubscribedTruly";
const cookieName4 = "sub_number_premium";
const cookies = document.cookie.split(";");

let cookieValue = null;
let subNumber = null;
let subNumber_Premium = null;

let hasSubscribedTruly = null;
for (let i = 0; i < cookies.length; i++) {
  const cookie = cookies[i].trim();
  if (cookie.startsWith("hasSubscribed=")) {
    cookieValue = cookie.substring(cookieName.length + 1);
    break;
  }
}
for (let i = 0; i < cookies.length; i++) {
  const cookie = cookies[i].trim();
  if (cookie.startsWith("sub_number=")) {
    subNumber = cookie.substring(cookieName2.length + 1);
    break;
  }
}
for (let i = 0; i < cookies.length; i++) {
  const cookie = cookies[i].trim();
  if (cookie.startsWith("hasSubscribedTruly=")) {
    hasSubscribedTruly = cookie.substring(cookieName3.length + 1);
    break;
  }
}
for (let i = 0; i < cookies.length; i++) {
  const cookie = cookies[i].trim();
  if (cookie.startsWith("sub_number_premium=")) {
    subNumber_Premium = cookie.substring(cookieName4.length + 1);
    break;
  }
}
switch (plan) {
  case "basic":
    amount = 300000;
    pls.innerHTML = "You have chosen a basic plan";
    subPlan = "Basic";
    break;
  case "premium":
    amount = 600000;
    pls.innerHTML = "You have chosen a premium premium plan";
    subPlan = "Premium";
    break;
  default:
    amount = 300000;
    pls.innerHTML = "You have chosen a basic plan";
    subPlan = "Basic";
    break;
}

function payWithPaystack(email, phone, amount, plan, no_days_left) {
  console.log(plan);
  var handler = PaystackPop.setup({
    key: publicKey,
    email: email,
    amount: amount,
    currency: "NGN",
    ref: "" + Math.floor(Math.random() * 1000000000 + 1),
    callback: function (response) {
      const currentDate = new Date();
      const options = { day: "numeric", month: "short", year: "numeric" };
      const formattedDate = currentDate.toLocaleDateString("en-US", options);

      console.log(response);

      // Make a POST request to save the data to database
      fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          subscription: plan,
          phone: phone,
          no_days_left: no_days_left,
        }),
      })
        .then((response) => response.json())
        .then((data) => console.log("Success:", data))
        .catch((error) => {
          console.error("Error:", error);
        });

      Swal.fire({
        icon: "success",
        title: "Payment complete!",
        text: "Reference: " + response.reference,
      }).then((value) => {
        hasPaid = true;
        btn.disabled = true;
        btnText = "Please wait...";
        btn.innerHTML = btnText;
        document.cookie =
          "hasSubscribed=true; expires=" +
          new Date(
            Date.now() + no_days_left * 24 * 60 * 60 * 1000
          ).toUTCString() +
          "; path=/";
        console.log("plan", plan);
        if (plan == "Basic") {
          document.cookie =
            "sub_number=" +
            phone +
            "; expires=" +
            new Date(
              Date.now() + no_days_left * 24 * 60 * 60 * 1000
            ).toUTCString() +
            "; path=/";
        }
        if (plan == "Premium") {
          document.cookie =
            "sub_number=" +
            phone +
            "; expires=" +
            new Date(
              Date.now() + no_days_left * 24 * 60 * 60 * 1000
            ).toUTCString() +
            "; path=/";
          document.cookie =
            "sub_number_premium=" +
            phone +
            "; expires=" +
            new Date(
              Date.now() + no_days_left * 24 * 60 * 60 * 1000
            ).toUTCString() +
            "; path=/";
        }

        // const apiUrl = `http://binxai.tekcify.com:4000/request?phone=${phone}`;
        const apiUrl = `/api/request?phone=${phone}`;

        // Make a GET request to the API
        fetch(apiUrl)
          .then((response) => response.json())
          .then((data) => {
            console.log(data);
            if (data.successful === "Open Your WhatsApp!") {
              document.getElementById("otp-div").classList.remove("d-none");

              Swal.fire({
                icon: "success",
                title: "Code Sent",
                text: "OTP code have been sent to your whatsapp!",
              }).then((value) => {
                btn.disabled = false;
                btnText = "Continue";
                btn.innerHTML = btnText;
                sentOtp = true;
              });
            } else if (data.cooldown) {
              Swal.fire({
                icon: "info",
                title: "Cooldown",
                text: data.cooldown,
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Invalid Whatsapp Number",
                text: "Oopps! Seems you provided an invalid WhatsApp number",
              }).then((value) => {
                btn.disabled = false;
                btnText = "Continue";
                btn.innerHTML = btnText;
                sentOtp = false;
              });
            }
            console.log(data);
          })
          .catch((error) => {
            // Handle any errors
            console.error(error);
          });
      });
    },
    onClose: function () {
      Swal.fire({
        icon: "error",
        title: "Transaction not completed!",
        text: "Window closed.",
      });
    },
  });
  handler.openIframe();
}
const phoneField = document.getElementById("phoneNumber");
phoneField.addEventListener("input", function (event) {
  const inputValue = event.target.value;
  const numericValue = inputValue.replace(/\D/g, "");

  event.target.value = numericValue;
});
// Add event listener to the form submit event
document
  .getElementById("paymentForm")
  .addEventListener("submit", async function (event) {
    const fname = document.getElementById("firstName").value;
    const lname = document.getElementById("lastName").value;
    const name = fname + " " + lname;
    const email = document.getElementById("email").value;
    const phone = document
      .getElementById("phoneNumber")
      .value.replace(/^0+/, "");
    const countryCode = document.getElementById("countryCode").value;
    const otp = document.getElementById("otp-div");
    const otpValue = document.getElementById("otp").value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      fname.trim() !== "" &&
      lname.trim() !== "" &&
      phone.trim() !== "" &&
      emailRegex.test(email)
    ) {
      // Display the OTP input field
      event.preventDefault();

      const phoneNumber = countryCode + phone.trim();
      console.log(
        subNumber,
        subNumber_Premium,
        hasSubscribedTruly,
        cookieValue
      );
      let check_duplicate = false;
      if (subPlan == "Premium") {
        console.log("PremiumPremiumPremium");

        if (
          cookieValue == "true" &&
          (hasSubscribedTruly == "true") & (subNumber_Premium == phoneNumber)
        ) {
          check_duplicate = true;
          console.log(true);
        }
      }
      if (subPlan == "Basic") {
        console.log("BasicBasicBasic");

        if (
          cookieValue == "true" &&
          (subNumber == phoneNumber) & (hasSubscribedTruly == "true")
        ) {
          check_duplicate = true;
          console.log(true);
        }
      }
      console.log("check_duplicate", check_duplicate);
      if (check_duplicate == true) {
        Swal.fire({
          icon: "info",
          title: "Duplicate Subscription",
          text: "Seems this number has been subscribed already, please try different number!",
        });
      } else {
        let check_again = false;
        if (subPlan == "Basic") {
          if (!hasPaid && subNumber != phoneNumber) {
            check_again = true;
          }
        }
        if (subPlan == "Premium") {
          if (!hasPaid && subNumber_Premium != phoneNumber) {
            check_again = true;
          }
        }
        if (check_again == true) {
          // Make a GET request to get the amount to pay if subscription exist and is a basic plan
          let amount_sent;
          let no_days_left;
          await fetch(`/api/get_amount?phone=${phoneNumber}&plan=${subPlan}`)
            .then((response) => response.json())
            .then((data) => {
              // change amount is needed
              if (data.status == 200 && data.failed == false) {
                console.log("Amount changed");
                amount_sent = data.amount;
                no_days_left = data.no_days_left;
                no_days_left_ = data.no_days_left;
              }
              console.log("Success:", data);
            })
            .catch((error) => {
              console.error("Error:", error);
            });

          // then pay with amount
          console.log(amount_sent);
          if (!amount_sent) {
            amount_sent = amount;
          }
          if (!no_days_left) {
            no_days_left = 30;
          }
          console.log(amount_sent);
          console.log(no_days_left);

          payWithPaystack(
            email,
            phoneNumber,
            amount_sent,
            subPlan,
            no_days_left
          );
        }
      }
      let check_again2 = false;
      if (subPlan == "Basic") {
        if (hasPaid && subNumber != phoneNumber) {
          check_again2 = true;
        }
      }
      if (subPlan == "Premium") {
        if (hasPaid && subNumber_Premium != phoneNumber) {
          check_again2 = true;
        }
      }

      //for the below
      let check_again3 = false;
      if (subPlan == "Basic") {
        if (subNumber == phoneNumber) {
          check_again3 = true;
        }
      }
      if (subPlan == "Premium") {
        if (subNumber_Premium == phoneNumber) {
          check_again3 = true;
        }
      }
      //////////
      if (check_again2 == true || (hasPaid && !hasSubscribedTruly)) {
        if (!sentOtp) {
          btn.disabled = true;
          btnText = "Please wait...";
          btn.innerHTML = btnText;
          document.cookie =
            "hasSubscribed=true; expires=" +
            new Date(
              Date.now() + no_days_left_ * 24 * 60 * 60 * 1000
            ).toUTCString() +
            "; path=/";
          if (subPlan == "Basic") {
            document.cookie =
              "sub_number=" +
              phone +
              "; expires=" +
              new Date(
                Date.now() + no_days_left_ * 24 * 60 * 60 * 1000
              ).toUTCString() +
              "; path=/";
          }
          if (subPlan == "Premium") {
            document.cookie =
              "sub_number=" +
              phone +
              "; expires=" +
              new Date(
                Date.now() + no_days_left_ * 24 * 60 * 60 * 1000
              ).toUTCString() +
              "; path=/";
            document.cookie =
              "sub_number_premium=" +
              phone +
              "; expires=" +
              new Date(
                Date.now() + no_days_left_ * 24 * 60 * 60 * 1000
              ).toUTCString() +
              "; path=/";
          }

          // const apiUrl = `http://binxai.tekcify.com:4000/request?phone=${phone}`;
          const apiUrl = `/api/request?phone=${phone}`;

          // Make a GET request to the API
          fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
              console.log(data);

              if (data.successful === "Open Your WhatsApp!") {
                document.getElementById("otp-div").classList.remove("d-none");

                Swal.fire({
                  icon: "success",
                  title: "Code Sent",
                  text: "OTP code have been sent to your whatsapp!",
                }).then((value) => {
                  btn.disabled = false;
                  btnText = "Continue";
                  btn.innerHTML = btnText;
                  sentOtp = true;
                });
              } else if (data.cooldown) {
                Swal.fire({
                  icon: "info",
                  title: "Cooldown",
                  text: data.cooldown,
                });
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Invalid Whatsapp Number",
                  text: "Oopps! Seems you provided an invalid WhatsApp number",
                }).then((value) => {
                  btn.disabled = false;
                  btnText = "Continue";
                  btn.innerHTML = btnText;
                  sentOtp = false;
                });
              }
              console.log(data);
            })
            .catch((error) => {
              // Handle any errors
              console.error(error);
            });
        }
      } else if (
        hasPaid &&
        check_again3 == true &&
        hasSubscribedTruly == "true"
      ) {
        Swal.fire({
          icon: "info",
          title: "Duplicate Subscription",
          text: "Seems this number has been subscribed already, please try different number!",
        });
      }
    }
  });

btn.addEventListener("click", () => {
  const otpValue = document.getElementById("otp").value;
  const phone = document.getElementById("phoneNumber").value.replace(/^0+/, "");
  const countryCode = document.getElementById("countryCode").value;
  const phoneNumber = countryCode.replace("+", "") + phone.trim();
  if (sentOtp) {
    if (otpValue.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Invalid or Expired Code",
        text: "The OTP code is invalid or has expired. Please check again",
      });
    } else {
      // const apiUrl = `http://binxai.tekcify.com:4000/verify?phone=${phoneNumber}&subscription=${subPlan}&code=${otpValue.trim()}`;
      const apiUrl = `/api/verify?phone=${phoneNumber}&subscription=${subPlan}&code=${otpValue.trim()}`;

      fetch(apiUrl)
        .then((response) => response.json())
        .then((data) => {
          console.log(data);

          if (data.failed === "Invalid or Expired Code") {
            Swal.fire({
              icon: "error",
              title: "Invalid or Expired Code",
              text: "The OTP code is invalid or has expired.",
            });
          } else if (data.successful.startsWith("Congratulations")) {
            Swal.fire({
              icon: "info",
              title: "Congratulations 🎊",
              text: `You are now registered as ${subPlan} user.`,
            }).then((value) => {
              document.cookie =
                "hasSubscribedTruly=true; expires=" +
                new Date(
                  Date.now() + no_days_left_ * 24 * 60 * 60 * 1000
                ).toUTCString() +
                "; path=/";
              window.location.href =
                "https://wa.me/2349057642334?text=Hello%20Binx%20AI";
            });
          }
          console.log(data);
        })
        .catch((error) => {
          // Handle any errors
          console.error(error);
        });
    }
  }
});
