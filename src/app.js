import API, { graphqlOperation } from "@aws-amplify/api";
import Auth from "@aws-amplify/auth";
import PubSub from "@aws-amplify/pubsub";
import { createTodo } from "./graphql/mutations";
import { listTodos } from "./graphql/queries";
import { onCreateTodo } from "./graphql/subscriptions";
import awsconfig from "./aws-exports";

Auth.configure(awsconfig);
API.configure(awsconfig);
PubSub.configure(awsconfig);

const strings = ['quick', 'brown', 'fox', 'jumped', 'over', 'the', 'log', 'baby', 'bird', 'broccoli'];

async function createNewTodo() {
  const todo = { name: randomString(), description: randomString() };
  console.log("sending request to graphql API");
  return await API.graphql(graphqlOperation(createTodo, { input: todo }));
}

function onError(err) {
  alert(err);
  console.error(err);
}

function getRandomIndex() {
  return Math.floor(Math.random() * 10);
}

function randomString() {
  return strings[getRandomIndex()] + getRandomIndex();
}

const MutationButton = document.getElementById("MutationEventButton");
const LoginButton = document.getElementById("LoginButton");
const MutationResult = document.getElementById("MutationResult");
const SubscriptionResult = document.getElementById("SubscriptionResult");
const QueryResult = document.getElementById("QueryResult");

MutationButton.addEventListener("click", evt => {
  MutationResult.innerHTML = `MUTATION RESULTS:`;
  createNewTodo()
    .then(evt => {
      console.log("TODO created. printing result.");
      MutationResult.innerHTML += `<p>${evt.data.createTodo.name} - ${evt.data.createTodo.description}</p>`;
    })
    .catch(onError);
});

LoginButton.addEventListener('click', e => {
  signIn();
});

async function signIn() {
  try {
    let username = prompt("Enter username");
    let password = prompt("Enter password");
    const user = await Auth.signIn(username, password);
    console.log('user response: ', user);
    if (
      user.challengeName === "SMS_MFA" ||
      user.challengeName === "SOFTWARE_TOKEN_MFA"
    ) {
      // You need to get the code from the UI inputs
      // and then trigger the following function with a button click
      const code = prompt('MFA code required, enter it now');
      // If MFA is enabled, sign-in should be confirmed with the confirmation code
      const loggedUser = await Auth.confirmSignIn(
        user, // Return object from Auth.signIn()
        code, // Confirmation code
        mfaType // MFA Type e.g. SMS_MFA, SOFTWARE_TOKEN_MFA
      );
    } else if (user.challengeName === "NEW_PASSWORD_REQUIRED") {
      const { requiredAttributes } = user.challengeParam; // the array of required attributes, e.g ['email', 'phone_number']
      // You need to get the new password and required attributes from the UI inputs
      // and then trigger the following function with a button click
      // For example, the email and phone_number are required attributes
      const obj = {};
      obj.newPassword = prompt('enter newPassword');
      obj.username = prompt('enter username');
      obj.email = prompt('enter email');
      obj.phone_number = prompt('enter phone_number');
      const { username, email, phone_number } = getInfoFromUserInput();
      const loggedUser = await Auth.completeNewPassword(
        user, // the Cognito User Object
        newPassword, // the new password
        // OPTIONAL, the required attributes
        {
          email,
          phone_number
        }
      );
    } else if (user.challengeName === "MFA_SETUP") {
      // This happens when the MFA method is TOTP
      // The user needs to setup the TOTP before using it
      // More info please check the Enabling MFA part
      alert('MFA Setup required.');
      Auth.setupTOTP(user);
    } else {
      // The user directly signs in
      console.log(user);
      alert('The user has been signed in. Refresh the page to see existing data or press Add Data to create new data.');
    }
  } catch (err) {
    alert(err.code);
    if (err.code === "UserNotConfirmedException") {
      // The error happens if the user didn't finish the confirmation step when signing up
      // In this case you need to resend the code and confirm the user
      // About how to resend the code and confirm the user, please check the signUp part
    } else if (err.code === "PasswordResetRequiredException") {
      // The error happens when the password is reset in the Cognito console
      // In this case you need to call forgotPassword to reset the password
      // Please check the Forgot Password part.
    } else if (err.code === "NotAuthorizedException") {
      // The error happens when the incorrect password is provided
    } else if (err.code === "UserNotFoundException") {
      // The error happens when the supplied username/email does not exist in the Cognito user pool
    } else {
      console.log(err);
    }
  }
}

async function getData() {
  QueryResult.innerHTML = `QUERY RESULTS`;
  API.graphql(graphqlOperation(listTodos))
    .then(evt => {
      evt.data.listTodos.items.map(
        (todo, i) =>
          (QueryResult.innerHTML += `<p>${todo.name} - ${todo.description}</p>`)
      );
    })
    .catch(onError);
}

API.graphql(graphqlOperation(onCreateTodo)).subscribe({
  next: evt => {
    SubscriptionResult.innerHTML = `SUBSCRIPTION RESULTS`;
    const todo = evt.value.data.onCreateTodo;
    SubscriptionResult.innerHTML += `<p>${todo.name} - ${todo.description}</p>`;
  }
});

getData();
