export class Url extends Yolo.Node {

  constructor () {
    super();

    this.identifier = 'Url(:toString)';

    this.adapter = 'Adapter.Name';

    this.fields = {

      protocol: new class Url_Protocol extends Yolo.Branch {

        constructor () {

          

        }

      }

    }

  }

}
